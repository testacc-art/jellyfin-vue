<template>
  <div :class="{ stretch: stretch }">
    <video
      ref="player"
      :poster="poster.url"
      crossorigin="anonymous"
      playsinline
      @timeupdate="onProgressThrottled"
      @pause="onPause"
      @play="onPlay"
      @ended="onStopped"
      style="width: 100%; height: 100%"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import VideoJs, { VideoJsPlayer } from 'video.js';
// @ts-expect-error - No types for libass
import SubtitlesOctopus from 'libass-wasm';
// @ts-expect-error - No types for libass
import SubtitlesOctopusWorker from 'libass-wasm/dist/js/subtitles-octopus-worker.js';
// @ts-expect-error - No types for libass
import SubtitlesOctopusWorkerLegacy from 'libass-wasm/dist/js/subtitles-octopus-worker-legacy.js';
import throttle from 'lodash/throttle';
import { mapActions, mapGetters, mapState, mapMutations } from 'vuex';
import {
  BaseItemDto,
  MediaSourceInfo,
  PlaybackInfoResponse,
  SubtitleDeliveryMethod
} from '@jellyfin/client-axios';
import { stringify } from 'qs';
import imageHelper, { ImageUrlInfo } from '~/mixins/imageHelper';
import timeUtils from '~/mixins/timeUtils';
import { AppState } from '~/store';
import { PlaybackTrack } from '~/store/playbackManager';

// Using requires so those aren't treeshaked and loaded by the webpack file loader as static assets
require('libass-wasm/dist/js/subtitles-octopus-worker.data');
require('libass-wasm/dist/js/subtitles-octopus-worker-legacy.data');
require('libass-wasm/dist/js/subtitles-octopus-worker-legacy.js.mem');
require('libass-wasm/dist/js/subtitles-octopus-worker.wasm');

export default Vue.extend({
  mixins: [imageHelper, timeUtils],
  props: {
    stretch: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      playbackInfo: {} as PlaybackInfoResponse,
      source: '',
      videojs: undefined as VideoJsPlayer | undefined,
      octopus: undefined as SubtitlesOctopus | undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      unsubscribe(): void {},
      subtitleTrack: undefined as PlaybackTrack | undefined,
      restartTime: undefined as number | undefined
    };
  },
  computed: {
    ...mapGetters('playbackManager', [
      'getCurrentItem',
      'getCurrentItemParsedSubtitleTracks',
      'getCurrentItemVttParsedSubtitleTracks',
      'getCurrentItemAssParsedSubtitleTracks'
    ]),
    ...mapState('playbackManager', [
      'currentTime',
      'currentVolume',
      'currentMediaSource',
      'currentAudioStreamIndex',
      'currentSubtitleStreamIndex'
    ]),
    ...mapState('deviceProfile', ['deviceId']),
    ...mapState('user', ['accessToken']),
    poster(): ImageUrlInfo | string {
      return this.getImageInfo(this.getCurrentItem, { preferBackdrop: true });
    },
    videoElement(): HTMLVideoElement {
      return this.$refs.player as HTMLVideoElement;
    }
  },
  watch: {
    getCurrentItem(newItem, oldItem): void {
      if (newItem !== oldItem) this.getPlaybackUrl();
    },
    source(newSource): void {
      this.destroy();

      if (!this.videojs) {
        this.$nuxt.error({
          message: this.$t('browserNotSupported')
        });
        return;
      }

      const item = this.getCurrentItem as BaseItemDto;

      this.videojs.src(newSource);

      const startTime =
        this.restartTime ||
        this.ticksToMs(item.UserData?.PlaybackPositionTicks || 0) / 1000;
      this.videojs.currentTime(startTime);

      this.videojs.play();

      this.subtitleTrack = (
        this.getCurrentItemParsedSubtitleTracks as PlaybackTrack[]
      ).find((sub) => sub.srcIndex === this.currentSubtitleStreamIndex);

      // If index isn't -1 and there's no sub found, it doesn't exist and we reset it
      if (this.currentSubtitleStreamIndex !== -1 && !this.subtitleTrack) {
        this.SET_CURRENT_SUBTITLE_TRACK_INDEX({
          subtitleStreamIndex: -1
        });
      }

      // Will display (or not) current external subtitle when start of video is loaded
      this.videojs.one('loadeddata', () => {
        this.displayExternalSub(this.subtitleTrack);
      });

      this.unsubscribe = this.$store.subscribe((mutation, _state: AppState) => {
        switch (mutation.type) {
          case 'playbackManager/PAUSE_PLAYBACK':
            this.videojs?.pause();
            break;
          case 'playbackManager/UNPAUSE_PLAYBACK':
            this.videojs?.play();
            break;
          case 'playbackManager/CHANGE_CURRENT_TIME':
            if (mutation?.payload?.time !== null) {
              this.videojs?.currentTime(mutation?.payload?.time);
            }

            break;
          case 'playbackManager/SET_VOLUME':
            this.videojs?.volume(Math.pow(this.currentVolume / 100, 3));
            break;

          case 'playbackManager/SET_CURRENT_SUBTITLE_TRACK_INDEX':
            if (mutation?.payload?.subtitleStreamIndex !== null) {
              this.changeSubtitle(mutation?.payload?.subtitleStreamIndex);
            }
            break;

          case 'playbackManager/SET_CURRENT_AUDIO_TRACK_INDEX':
            if (mutation?.payload?.audioStreamIndex !== null) {
              // Set the restart time so that the function knows where to restart
              this.restartTime = this.videoElement.currentTime;
              this.getPlaybackUrl();
            }
        }
      });
    }
  },
  mounted() {
    this.videojs = VideoJs(this.videoElement, undefined, this.getPlaybackUrl);
  },
  beforeDestroy() {
    this.onStopped(); // Report that the playback is stopping

    this.destroy();
    if (this.videojs) {
      this.videojs.dispose();
    }
  },
  methods: {
    ...mapActions('playbackManager', [
      'pause',
      'unpause',
      'setNextTrack',
      'setMediaSource',
      'setCurrentTime',
      'setPlaySessionId'
    ]),
    ...mapMutations('playbackManager', ['SET_CURRENT_SUBTITLE_TRACK_INDEX']),
    async getPlaybackUrl(): Promise<void> {
      if (this.getCurrentItem && this.getCurrentItem.Id) {
        this.playbackInfo = (
          await this.$api.mediaInfo.getPostedPlaybackInfo(
            {
              itemId: this.getCurrentItem.Id,
              userId: this.$auth.user?.Id,
              autoOpenLiveStream: true,
              playbackInfoDto: { DeviceProfile: this.$playbackProfile },
              mediaSourceId: this.getCurrentItem.Id,
              audioStreamIndex: this.currentAudioStreamIndex,
              subtitleStreamIndex: this.currentSubtitleStreamIndex
            },
            { progress: false }
          )
        ).data;

        this.setPlaySessionId({ id: this.playbackInfo.PlaySessionId });

        if (!this.playbackInfo?.MediaSources?.[0]) {
          throw new Error("This item can't be played.");
        }

        const mediaSource = this.playbackInfo.MediaSources[0];

        this.setMediaSource({ mediaSource });

        if (mediaSource.SupportsDirectStream) {
          const directOptions: Record<
            string,
            string | boolean | undefined | null
          > = {
            Static: true,
            mediaSourceId: mediaSource.Id,
            deviceId: this.deviceId,
            api_key: this.accessToken
          };

          if (mediaSource.ETag) {
            directOptions.Tag = mediaSource.ETag;
          }

          if (mediaSource.LiveStreamId) {
            directOptions.LiveStreamId = mediaSource.LiveStreamId;
          }

          const params = stringify(directOptions);

          this.source = `${this.$axios.defaults.baseURL}/Videos/${mediaSource.Id}/stream.${mediaSource.Container}?${params}`;
        } else if (
          mediaSource.SupportsTranscoding &&
          mediaSource.TranscodingUrl
        ) {
          this.source =
            this.$axios.defaults.baseURL + mediaSource.TranscodingUrl;
        }
      }
    },
    async changeSubtitle(newsrcIndex: number): Promise<void> {
      // Find new sub
      const newSub = (
        this.getCurrentItemParsedSubtitleTracks as PlaybackTrack[]
      ).find((el) => el.srcIndex === newsrcIndex);

      // If we currently have a sub burned in or will have, a change implies to always fetch a new video stream
      if (
        (this.subtitleTrack &&
          this.subtitleTrack.type === SubtitleDeliveryMethod.Encode) ||
        (newSub && newSub.type === SubtitleDeliveryMethod.Encode)
      ) {
        // Set the restart time so that the function knows where to restart
        this.restartTime = this.videoElement.currentTime;
        await this.getPlaybackUrl();

        return;
      }

      // Manage non-encoded subs
      this.displayExternalSub(newSub);
    },
    displayExternalSub(newSub?: PlaybackTrack) {
      // Disable octopus
      if (this.octopus) {
        this.octopus.freeTrack();
      }

      // Disable VTT
      for (let i = 0; i < (this.videojs?.textTracks().length || 0); ++i) {
        if (this.videojs?.textTracks()[i].kind === 'subtitles') {
          // @ts-expect-error - Wrong typing but works
          this.videojs.removeRemoteTextTrack(this.videojs.textTracks()[i]);
        }
      }

      // If new sub doesn't exist, we're done here
      if (!newSub) {
        this.subtitleTrack = newSub;

        return;
      }

      // Find the sub in the VTT or ASS subs
      const vttIdx = (
        this.getCurrentItemVttParsedSubtitleTracks as PlaybackTrack[]
      ).findIndex((el) => el.srcIndex === newSub.srcIndex);
      const assIdx = (
        this.getCurrentItemAssParsedSubtitleTracks as PlaybackTrack[]
      ).findIndex((el) => el.srcIndex === newSub.srcIndex);

      if (vttIdx !== -1) {
        const track = this.videojs?.addRemoteTextTrack(
          { src: this.$axios.defaults.baseURL + (newSub.src || '') },
          true
        );
        if (track) {
          track.addEventListener('load', () => {
            for (let i = 0; i < (this.videojs?.textTracks().length || 0); ++i) {
              if (this.videojs?.textTracks()[i].kind === 'subtitles') {
                this.videojs.textTracks()[i].mode = 'showing';
              }
            }
          });
        }
      } else if (assIdx !== -1) {
        if (!this.octopus) {
          this.octopus = new SubtitlesOctopus({
            video: this.videoElement,
            workerUrl: SubtitlesOctopusWorker,
            legacyWorkerUrl: SubtitlesOctopusWorkerLegacy,
            subUrl: this.$axios.defaults.baseURL + (newSub.src || ''),
            blendRender: true
          });
        } else {
          this.octopus.setTrackByUrl(
            this.$axios.defaults.baseURL + (newSub.src || '')
          );
        }

        this.subtitleTrack = newSub;
      }
    },
    destroy() {
      if (this.octopus) {
        this.octopus.dispose();
        this.octopus = undefined;
      }

      this.unsubscribe();
    },
    onPlay(_event?: Event): void {
      this.unpause();
    },
    onProgressThrottled: throttle(function (_event?: Event) {
      // @ts-expect-error - TypeScript is confusing the typings with lodash's
      this.onProgress(_event);
    }, 500),
    onProgress(_event?: Event): void {
      if (this.videoElement) {
        const currentTime = this.videoElement.currentTime;

        this.setCurrentTime({ time: currentTime });
      }
    },
    onPause(_event?: Event): void {
      if (this.videoElement) {
        const currentTime = this.videoElement.currentTime;

        this.setCurrentTime({ time: currentTime });
        this.pause();
      }
    },
    onStopped(_event?: Event): void {
      if (this.videoElement) {
        const currentTime = this.videoElement.currentTime;

        this.setCurrentTime({ time: currentTime });
        this.setNextTrack();
      }
    },
    togglePictureInPicture(): void {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        this.videoElement.requestPictureInPicture();
      }
    }
  }
});
</script>

<style>
@import 'video.js/dist/video-js.min.css';

.vjs-loading-spinner {
  display: none !important;
}
</style>

<style scoped>
.videoControls {
  max-width: 100vw;
  max-height: 100vh;
}

.stretch {
  width: 100vw !important;
  height: 100vh !important;
}
</style>

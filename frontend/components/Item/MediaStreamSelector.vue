<template>
  <v-select
    v-model="trackIndex"
    outlined
    filled
    flat
    dense
    single-line
    hide-details
    class="text-truncate"
    :items="selectItems"
    @input="$emit('input', $event)"
  >
    <template slot="selection" slot-scope="{ item }">
      {{ item.text.selection }}
    </template>

    <template slot="item" slot-scope="{ item, on, attrs }">
      <v-list-item v-bind="attrs" :two-line="!!item.text.subtitle" v-on="on">
        <v-list-item-avatar v-if="item.text.icon">
          <v-icon>{{ item.text.icon }}</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{ item.text.title }}</v-list-item-title>
          <v-list-item-subtitle v-if="item.text.subtitle">
            {{ item.text.subtitle }}
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-select>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import langs from 'langs';
import { MediaStream } from '@jellyfin/client-axios';

interface SelectItems {
  selection: string;
  subtitle: string | undefined;
  icon: string | undefined;
  title: string;
}

export default Vue.extend({
  props: {
    /**
     * Media streams to display in the selector
     */
    mediaStreams: {
      type: Array as PropType<MediaStream[]>,
      default: () => []
    },
    /**
     * Media streams type
     */
    type: {
      type: String,
      required: true
    },
    /**
     * Overrides the default track number
     */
    defaultStreamIndex: {
      type: Number,
      default: undefined
    }
  },
  data() {
    return { trackIndex: -1 as number };
  },
  computed: {
    selectItems: {
      /**
       * Used to model the media stream index as a value and the potential strings
       *
       * @returns {{text: SelectItems, value: number}[]} List of objects prepared for Vuetify v-select with the strings to display as "text" and index number as "value".
       */
      get(): { text: SelectItems; value: number | undefined }[] {
        const items = this.mediaStreams.map((value, _idx) => {
          return {
            text: {
              selection: value.DisplayTitle ?? '',
              subtitle: this.getTrackSubtitle(value),
              icon: this.getTrackIcon(value),
              title: value.DisplayTitle ?? ''
            },
            value: value.Index
          };
        });

        if (this.type === 'Subtitle') {
          items.unshift({
            value: -1,
            text: {
              selection: this.$t('disabled'),
              title: this.$t('disabled'),
              subtitle: undefined,
              icon: undefined
            }
          });
        }

        return items;
      }
    },
    /**
     * @returns {number|undefined} Default index to use (undefined if none)
     */
    defaultIndex: {
      get(): number | undefined {
        if (this.defaultStreamIndex !== undefined) {
          return this.defaultStreamIndex;
        }

        return this.mediaStreams.find((track) => track.IsDefault)?.Index;
      }
    }
  },
  watch: {
    defaultStreamIndex(newValue) {
      if (newValue !== this.trackIndex) {
        this.trackIndex = newValue;
      }
    }
  },
  /**
   * Sets the default track when loading the component
   */
  beforeMount() {
    if (this.defaultIndex !== undefined) {
      this.trackIndex = this.defaultIndex;
    }

    /**
     * Check if Type is Video and trackIndex is -1 then set trackIndex as this.selectItems[0].value
     */
    if (
      this.type === 'Video' &&
      this.trackIndex === -1 &&
      this.selectItems[0].value !== undefined
    ) {
      this.trackIndex = this.selectItems[0].value;
    }

    this.$emit('input', this.trackIndex);
  },
  methods: {
    /**
     * @param {MediaStream} track - Track to parse
     * @returns {string|undefined} Optional icon to use for the track line in the v-select menu
     */
    getTrackIcon(track: MediaStream): string | undefined {
      if (this.type === 'Audio' && track.ChannelLayout) {
        return this.getSurroundIcon(track.ChannelLayout);
      }
    },
    /**
     * @param {MediaStream} track - Track to parse
     * @returns {string|undefined} Optional subtitle to use for the track line in the v-select menu
     */
    getTrackSubtitle(track: MediaStream): string | undefined {
      if (
        (this.type === 'Audio' || this.type === 'Subtitle') &&
        track.Language
      ) {
        return this.getLanguageName(track.Language);
      } else if (this.type === 'Audio' || this.type === 'Subtitle') {
        return this.$t('undefined');
      }
    },
    /**
     * @param {string} code - Converts a two letters language code to full word
     * @returns {string} Full word
     */
    getLanguageName(code: string): string {
      return langs.where('2B', code)?.name || '';
    },
    /**
     * @param {string} layout - Audio layout to get related icon
     * @returns {string} Icon name
     */
    getSurroundIcon(layout: string): string {
      switch (layout) {
        case '2.0':
          return 'mdi-surround-sound-2-0';
        case '3.1':
          return 'mdi-surround-sound-3-1';
        case '5.1':
          return 'mdi-surround-sound-5-1';
        case '7.1':
          return 'mdi-surround-sound-7-1';
        default:
          return 'mdi-surround-sound';
      }
    }
  }
});
</script>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { type Song, useStore } from "@/stores/index";
import { convertDuration } from "@/utils/format";
import { onBeforeUnmount, ref, toRefs, watch } from "vue";

interface HighlightSegment {
    text: string;
    matched: boolean;
}

const store = useStore();
const { sortBy, searchBy, isSongPlaying, activeSongId } = storeToRefs(store);
const { revertLike, toggleSong } = store;
/** 输入值与Store查询词分离，避免每次按键都触发歌曲关联、过滤和排序计算。 */
const searchInput = ref(searchBy.value);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

/* PROPS */
const props = defineProps<{
    songs: Song[];
}>();
const { songs } = toRefs(props);

/** 输入停止300ms后再更新Store，在保持响应速度的同时减少无效复杂计算。 */
watch(searchInput, (query) => {
    if (searchTimer !== undefined) {
        clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => {
        searchBy.value = query.trim();
        searchTimer = undefined;
    }, 300);
});

/** Store可能被其他页面或清空操作修改，需要同步回输入框。 */
watch(searchBy, (query) => {
    if (query !== searchInput.value.trim()) {
        searchInput.value = query;
    }
});

/** 清空搜索需要立即恢复列表，无需等待防抖时间。 */
const clearSearch = () => {
    if (searchTimer !== undefined) {
        clearTimeout(searchTimer);
        searchTimer = undefined;
    }
    searchInput.value = "";
    searchBy.value = "";
};

/** 将文本拆成普通与命中片段，模板可安全高亮而不依赖v-html。 */
const getHighlightSegments = (text?: string): HighlightSegment[] => {
    const query = searchBy.value.trim();
    if (!text || !query) {
        return [{ text: text ?? "", matched: false }];
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const segments: HighlightSegment[] = [];
    let cursor = 0;
    let matchIndex = lowerText.indexOf(lowerQuery, cursor);

    while (matchIndex !== -1) {
        if (matchIndex > cursor) {
            segments.push({
                text: text.slice(cursor, matchIndex),
                matched: false,
            });
        }
        segments.push({
            text: text.slice(matchIndex, matchIndex + query.length),
            matched: true,
        });
        cursor = matchIndex + query.length;
        matchIndex = lowerText.indexOf(lowerQuery, cursor);
    }

    if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), matched: false });
    }
    return segments;
};

/** 组件卸载时清理尚未执行的防抖任务，避免离开页面后意外更新Store。 */
onBeforeUnmount(() => {
    if (searchTimer !== undefined) {
        clearTimeout(searchTimer);
    }
});
</script>
<template>
    <div class="m-3 min-w-0 sm:m-16">
        <div class="flex min-w-0 flex-col gap-2 xs:flex-row xs:px-5">
            <input
                class="w-full min-w-0 rounded-lg border-2 border-gray-200 px-3 py-2 text-black outline-none xs:max-w-xs"
                type="text"
                placeholder="搜索歌曲、专辑或艺术家"
                v-model="searchInput"
            />
            <select
                class="w-full min-w-0 rounded-lg border-2 border-gray-200 px-3 py-2 text-black outline-none xs:max-w-xs"
                v-model="sortBy"
            >
                <option value="title">TITLE</option>
                <option value="album">ALBUM</option>
                <option value="duration">DURATION</option>
            </select>
        </div>
        <table
            v-if="songs.length > 0"
            class="mt-4 block w-full xs:mt-5 xs:table xs:table-fixed"
        >
            <thead class="hidden xs:table-header-group">
                <tr>
                    <th class="hidden w-11 text-left xs:table-cell xs:pl-5">
                        #
                    </th>
                    <th class="text-left">TITLE</th>
                    <th class="text-left hidden xs:table-cell">ALBUM</th>
                    <th class="w-12 text-left"></th>
                    <th class="w-16 text-right pr-2 xs:pr-5">
                        DURATION
                    </th>
                </tr>
            </thead>
            <tbody class="block xs:table-row-group">
                <tr
                    v-for="(song, index) in songs"
                    :key="song.id"
                    class="group grid cursor-pointer grid-cols-[minmax(0,1fr)_3rem_3.5rem] border-b border-gray-lightest transition-all duration-200 hover:bg-gray-light xs:table-row"
                    @click="toggleSong(song.id)"
                >
                    <td class="text-left w-11 hidden xs:table-cell xs:pl-5">
                        <span class="group-hover:hidden">{{ index + 1 }}</span>
                        <button
                            class="hidden group-hover:block"
                            @click.stop="toggleSong(song.id)"
                        >
                            <img
                                src="@/assets/stop.png"
                                alt="Stop"
                                class="w-4"
                                v-if="isSongPlaying && activeSongId === song.id"
                            />
                            <img
                                src="@/assets/play.png"
                                alt="Play"
                                class="w-4"
                                v-else
                            />
                        </button>
                    </td>
                    <td class="block min-w-0 py-2 xs:table-cell">
                        <div class="flex min-w-0 flex-row items-center">
                        <img
                            :src="'album-covers/' + song.imgPath"
                            class="h-12 w-12 shrink-0 rounded-sm object-cover xs:h-12 xs:w-12"
                            alt="Song"
                        />
                        <div class="ml-2 flex min-w-0 flex-col">
                            <span class="truncate font-bold">
                                <span
                                    v-for="(segment, segmentIndex) in getHighlightSegments(song.title)"
                                    :key="segmentIndex"
                                    :class="{ 'bg-primary-normal text-white': segment.matched }"
                                >{{ segment.text }}</span>
                            </span>
                            <span class="truncate text-sm text-gray-400">
                                <span
                                    v-for="(segment, segmentIndex) in getHighlightSegments(song.artistName)"
                                    :key="segmentIndex"
                                    :class="{ 'bg-primary-normal text-white': segment.matched }"
                                >{{ segment.text }}</span>
                            </span>
                        </div>
                        </div>
                    </td>
                    <td class="hidden truncate text-left xs:table-cell">
                        <span
                            v-for="(segment, segmentIndex) in getHighlightSegments(song.albumName)"
                            :key="segmentIndex"
                            :class="{ 'bg-primary-normal text-white': segment.matched }"
                        >{{ segment.text }}</span>
                    </td>
                    <td class="block w-12 self-center text-center xs:table-cell">
                        <button
                            class="inline-flex h-11 w-11 items-center justify-center"
                            aria-label="Toggle liked song"
                            @click.stop="revertLike(song.id)"
                        >
                            <img
                                :src="
                                    song.isLiked
                                        ? 'heart-filled.png'
                                        : 'heart.png'
                                "
                                class="h-8 w-8 p-1"
                                alt=""
                            />
                        </button>
                    </td>
                    <td class="block w-14 self-center whitespace-nowrap pr-1 text-right text-xs text-gray-400 xs:table-cell xs:w-16 xs:pr-5 xs:text-base xs:text-white">
                        {{ convertDuration(song.duration) }}
                    </td>
                </tr>
            </tbody>
        </table>
        <div
            v-else-if="searchBy"
            class="flex flex-col items-center justify-center py-20 text-center"
        >
            <p class="text-lg font-bold">未找到相关歌曲</p>
            <button
                class="mt-4 border border-gray-400 px-4 py-2 hover:border-white"
                @click="clearSearch"
            >
                清空搜索
            </button>
        </div>
    </div>
</template>

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import albumsData from "@/datas/albums.json";
import artistsData from "@/datas/artists.json";
import songsData from "@/datas/songs.json";
import genresData from "@/datas/genres.json";

// 艺术家类型
export interface Artist {
    id: number; // 艺术家的唯一标识
    name: string; // 艺术家名字
}
// 专辑类型
export interface Album {
    id: number; // 专辑的唯一标识
    artistId: number; // 所属艺术家的ID，用于关联Artist
    artistName?: string; // 艺术家名字（可选，通过artistId查询后填充）
    name: string; // 专辑名称
    image: string; // 专辑封面图片路径
    year: number; // 发行年份
    isFavorite: boolean; // 是否已收藏
    backgroundColor: string; // 背景色，用于页面渐变效果
}

// 歌曲类型
export interface Song {
    id: number; // 歌曲的唯一标识
    title: string; // 歌曲名称
    duration: number; // 歌曲时长（单位：秒）
    albumId: number; // 所属专辑的ID，用于关联Album
    albumName?: string; // 专辑名称（可选，通过albumId查询后填充）
    imgPath?: string; // 封面图片路径（可选，通过albumId查询后填充）
    songPath: string; // 音频文件路径
    artistName?: string; // 艺术家名字（可选，通过albumId查询后填充）
    isLiked: boolean; // 是否已点赞
    genres: number[]; // 所属流派ID数组，一首歌可属于多个流派
}

// 音乐流派类型
export interface Genre {
    id: number; // 流派的唯一标识
    name: string; // 流派名称（如Pop、Rock）
    image: string; // 流派封面图片路径
    backgroundColor: string; // 背景色，用于页面渐变效果
}

// 歌曲排序方式
export type SortKey = "title" | "album" | "duration";
// 播放模式：顺序播放、单曲循环、随机播放
export type PlayMode = "sequence" | "single" | "random";

/** 播放模式按此顺序循环，集中定义可避免切换逻辑出现遗漏。 */
const PLAY_MODE_ORDER: PlayMode[] = ["sequence", "single", "random"];

export const useStore = defineStore(
    "store",
    () => {
        // ==================== State ====================

        /** 所有专辑数据，从JSON文件导入 */
        const albums = ref<Album[]>(albumsData as Album[]);
        /** 所有艺术家数据，从JSON文件导入 */
        const artists = ref<Artist[]>(artistsData as Artist[]);
        /** 所有歌曲数据，从JSON文件导入 */
        const songs = ref<Song[]>(songsData as Song[]);
        /** 所有流派数据，从JSON文件导入 */
        const genres = ref<Genre[]>(genresData as Genre[]);
        /** 歌曲排序方式，默认按歌名排序 */
        const sortBy = ref<SortKey>("title");
        /** 搜索关键词，默认为空 */
        const searchBy = ref<string>("");
        /** 提示消息内容（如"已添加到喜欢的歌曲"） */
        const alertMessage = ref<string>("");
        /** 当前查看的专辑ID */
        const activeAlbumId = ref<number>(0);
        /** 当前查看的流派ID */
        const activeGenreId = ref<number>(0);
        /** 当前播放的歌曲ID */
        const activeSongId = ref<number>(0);
        /** 当前播放模式，默认按当前排序列表顺序播放 */
        const playMode = ref<PlayMode>("sequence");
        /** 是否正在播放歌曲 */
        const isSongPlaying = ref<boolean>(false);
        /** 当前音频资源是否仍在加载，用于区分“想播放”和“已经可以播放” */
        const isAudioLoading = ref<boolean>(false);
        /** 原生 Audio API 最近一次播放或加载错误，空字符串表示当前无错误 */
        const audioError = ref<string>("");
        /** 提示消息的定时器ID（浏览器 window.setTimeout 返回 number），用于自动关闭提示 */
        const timeOut = ref<number>(0);
        /** 首页背景色风格 */
        const homePageBackground = ref<string>("primary");
        /** 当前歌曲播放进度（百分比0-100） */
        const songSeconds = ref<number>(0);
        /** 当前音量（0-100） */
        const volume = ref<number>(50);
        /** 静音前的音量，用于恢复音量 */
        const lastVolume = ref<number>(0);

        // ==================== Lookup Maps（O(1) 查找表） ====================

        /** 专辑ID → 专辑对象 的映射表 */
        const albumMap = computed(() => {
            const map = new Map<number, Album>();
            for (const album of albums.value) {
                map.set(album.id, album);
            }
            return map;
        });

        /** 艺术家ID → 艺术家对象 的映射表 */
        const artistMap = computed(() => {
            const map = new Map<number, Artist>();
            for (const artist of artists.value) {
                map.set(artist.id, artist);
            }
            return map;
        });

        /** 流派ID → 流派对象 的映射表 */
        const genreMap = computed(() => {
            const map = new Map<number, Genre>();
            for (const genre of genres.value) {
                map.set(genre.id, genre);
            }
            return map;
        });

        /** 歌曲ID → 歌曲对象 的映射表（基于原始数据，不含补充字段） */
        const songMap = computed(() => {
            const map = new Map<number, Song>();
            for (const song of songs.value) {
                map.set(song.id, song);
            }
            return map;
        });

        /** 艺术家ID → 该艺术家的专辑数组 的映射表（缓存，避免重复 filter） */
        const artistAlbumMap = computed(() => {
            const map = new Map<number, Album[]>();
            for (const album of albums.value) {
                const list = map.get(album.artistId);
                if (list) {
                    list.push(album);
                } else {
                    map.set(album.artistId, [album]);
                }
            }
            return map;
        });

        /** 歌曲ID → 在当前排序列表中的索引位置（O(1) 快速定位，供切歌使用） */
        const songIdToIndexMap = computed(() => {
            const map = new Map<number, number>();
            const list = songsWithAlbumName.value;
            for (let i = 0; i < list.length; i++) {
                map.set(list[i].id, i);
            }
            return map;
        });

        // ==================== Actions（供 computed 使用） ====================

        /** 根据专辑ID获取专辑名称，找不到返回空字符串 */
        function getAlbumName(albumId: number): string {
            return albumMap.value.get(albumId)?.name ?? "";
        }

        /** 根据专辑ID获取专辑封面图路径，找不到返回空字符串 */
        function getAlbumImage(albumId: number): string {
            return albumMap.value.get(albumId)?.image ?? "";
        }

        /** 根据专辑ID获取艺术家名称（先找专辑再找艺术家），找不到返回空字符串 */
        function getArtistName(albumId: number): string {
            const album = albumMap.value.get(albumId);
            if (!album) return "";
            return artistMap.value.get(album.artistId)?.name ?? "";
        }

        // ==================== Getters（computed） ====================

        /** 根据艺术家ID获取其所有专辑（返回浅拷贝，防止外部修改污染缓存） */
        function albumsOfArtist(artistId: number): Album[] {
            return artistAlbumMap.value.get(artistId)?.slice() ?? [];
        }

        /** 获取所有已收藏的专辑 */
        const favoriteAlbums = computed<Album[]>(() => {
            return albums.value.filter((album) => album.isFavorite);
        });

        /** 获取补充了专辑名、封面图、艺术家名的歌曲列表，先按searchBy过滤，再按sortBy排序 */
        const songsWithAlbumName = computed<Song[]>(() => {
            let result = songs.value.map((element) => ({
                ...element,
                albumName: getAlbumName(element.albumId),
                imgPath: getAlbumImage(element.albumId),
                artistName: getArtistName(element.albumId),
            }));
            const query = searchBy.value.trim().toLowerCase();
            if (query !== "") {
                result = result.filter(
                    (song) =>
                        song.title.toLowerCase().includes(query) ||
                        (song.albumName ?? "").toLowerCase().includes(query) ||
                        (song.artistName ?? "").toLowerCase().includes(query),
                );
            }
            return result.sort((a, b) => {
                if (sortBy.value === "title") {
                    return a.title.localeCompare(b.title);
                }
                if (sortBy.value === "album") {
                    return (a.albumName ?? "").localeCompare(b.albumName ?? "");
                }
                if (sortBy.value === "duration") {
                    return b.duration - a.duration;
                }
                return 0;
            });
        });

        /** 获取补充了艺术家名的专辑列表 */
        const albumWithArtistName = computed<Album[]>(() => {
            return albums.value.map((element) => ({
                ...element,
                artistName: getArtistName(element.id),
            }));
        });

        /** 获取所有已点赞的歌曲 */
        const likedSongs = computed<Song[]>(() => {
            return songsWithAlbumName.value.filter((song) => song.isLiked);
        });

        /** 获取当前查看的专辑对象，未匹配时返回 undefined */
        const activeAlbum = computed<Album | undefined>(() =>
            albumMap.value.get(activeAlbumId.value),
        );

        /** 获取当前专辑下的所有歌曲 */
        const activeAlbumSongs = computed<Song[]>(() => {
            return songsWithAlbumName.value.filter(
                (song) => song.albumId === activeAlbumId.value,
            );
        });

        /** 获取当前查看的流派对象，未匹配时返回 undefined */
        const activeGenre = computed<Genre | undefined>(() =>
            genreMap.value.get(activeGenreId.value),
        );

        /** 获取当前流派下的所有歌曲 */
        const activeGenreSongs = computed<Song[]>(() => {
            return songsWithAlbumName.value.filter((song) =>
                song.genres.includes(activeGenreId.value),
            );
        });

        /** 获取当前播放的歌曲对象（含补充字段），未匹配时返回 undefined */
        const activeSong = computed<Song | undefined>(() => {
            const raw = songMap.value.get(activeSongId.value);
            if (!raw) return undefined;
            return {
                ...raw,
                albumName: getAlbumName(raw.albumId),
                imgPath: getAlbumImage(raw.albumId),
                artistName: getArtistName(raw.albumId),
            };
        });

        // ==================== Actions ====================

        /** 根据流派ID获取该流派下的所有歌曲（含补充字段） */
        function getSongsByGenre(genreId: number): Song[] {
            return songsWithAlbumName.value.filter((song) =>
                song.genres.includes(genreId),
            );
        }

        /** 切换歌曲的点赞状态，并弹出提示消息 */
        function revertLike(songId: number): void {
            const song = songMap.value.get(songId);
            if (song) {
                song.isLiked = !song.isLiked;
                if (!song.isLiked) {
                    alertShow("Removed from Liked Songs", 2000);
                } else {
                    alertShow("Added to Liked Songs", 2000);
                }
            }
        }

        /** 显示提示消息，指定时间（毫秒）后自动消失 */
        function alertShow(message: string, duration: number): void {
            clearTimeout(timeOut.value);
            alertMessage.value = message;
            timeOut.value = window.setTimeout(() => {
                alertMessage.value = "";
                timeOut.value = 0;
            }, duration) as unknown as number;
        }

        /** 切换歌曲播放/暂停状态：同一首歌切换播放暂停，不同歌则切歌 */
        function toggleSong(songId: number): void {
            // 情况1：正在播放A，点了A → 暂停A
            if (isSongPlaying.value && activeSongId.value === songId) {
                isSongPlaying.value = !isSongPlaying.value;
            }
            // 情况2：正在播放A，点了B → 切到B（但不暂停，B会自动播放）
            else if (isSongPlaying.value && activeSongId.value !== songId) {
                activeSongId.value = songId;
            }
            // 情况3：暂停了A，又点A → 继续播放A
            else if (!isSongPlaying.value && activeSongId.value === songId) {
                isSongPlaying.value = true;
            }
            // 情况4：暂停了A（或什么都没播），点了B → 播放B
            else {
                activeSongId.value = songId;
                isSongPlaying.value = true;
            }
        }

        /** 切换静音/恢复音量，静音时记录当前音量以便恢复 */
        function toggleVolume(): number {
            // 如果当前音量为0，就恢复为上一次的音量（至少恢复到20，避免听不到）
            if (volume.value === 0) {
                volume.value = lastVolume.value < 20 ? 20 : lastVolume.value;
                return volume.value;
            }
            // 如果当前音量不为0，就记录下来，然后静音
            lastVolume.value = volume.value;
            volume.value = 0;
            return volume.value;
        }

        /** 按 sequence → single → random 的顺序切换播放模式。 */
        function togglePlayMode(): PlayMode {
            const currentIndex = PLAY_MODE_ORDER.indexOf(playMode.value);
            playMode.value =
                PLAY_MODE_ORDER[(currentIndex + 1) % PLAY_MODE_ORDER.length];
            return playMode.value;
        }

        /**
         * 根据播放模式计算下一首歌曲ID，但不直接修改状态。
         * 抽离选择逻辑后，按钮切歌、ended自动切歌和单元测试可以复用同一套规则。
         */
        function getNextSongId(): number {
            const list = songsWithAlbumName.value;
            if (list.length === 0) return activeSongId.value;
            if (playMode.value === "single") return activeSongId.value;

            if (playMode.value === "random") {
                const candidates = list.filter(
                    (song) => song.id !== activeSongId.value,
                );
                if (candidates.length === 0) return activeSongId.value;
                return candidates[Math.floor(Math.random() * candidates.length)]
                    .id;
            }

            const index = songIdToIndexMap.value.get(activeSongId.value);
            if (index === undefined) return activeSongId.value;
            return list[index === list.length - 1 ? 0 : index + 1].id;
        }

        /**
         * 根据播放模式计算上一首歌曲ID，但不直接修改状态。
         * 与下一首共用播放模式规则，避免前进和后退行为不一致。
         */
        function getPrevSongId(): number {
            const list = songsWithAlbumName.value;
            if (list.length === 0) return activeSongId.value;
            if (playMode.value === "single") return activeSongId.value;

            if (playMode.value === "random") {
                const candidates = list.filter(
                    (song) => song.id !== activeSongId.value,
                );
                if (candidates.length === 0) return activeSongId.value;
                return candidates[Math.floor(Math.random() * candidates.length)]
                    .id;
            }

            const index = songIdToIndexMap.value.get(activeSongId.value);
            if (index === undefined) return activeSongId.value;
            return list[index === 0 ? list.length - 1 : index - 1].id;
        }

        /** 应用下一首选择结果，并重置播放进度供Audio同步层加载或重新播放。 */
        function nextSong(): number {
            songSeconds.value = 0;
            activeSongId.value = getNextSongId();
            isSongPlaying.value = false;
            return activeSongId.value;
        }

        /** 应用上一首选择结果，并重置播放进度供Audio同步层加载或重新播放。 */
        function prevSong(): number {
            songSeconds.value = 0;
            activeSongId.value = getPrevSongId();
            isSongPlaying.value = false;
            return activeSongId.value;
        }

        // ==================== Return ====================
        return {
            // State
            albums,
            artists,
            songs,
            genres,
            sortBy,
            searchBy,
            alertMessage,
            activeAlbumId,
            activeGenreId,
            activeSongId,
            playMode,
            isSongPlaying,
            isAudioLoading,
            audioError,
            timeOut,
            homePageBackground,
            songSeconds,
            volume,
            lastVolume,
            // Getters (computed)
            favoriteAlbums,
            songsWithAlbumName,
            albumWithArtistName,
            likedSongs,
            activeAlbum,
            activeAlbumSongs,
            activeGenre,
            activeGenreSongs,
            activeSong,
            // Getters with params / Actions
            albumsOfArtist,
            getAlbumName,
            getAlbumImage,
            getArtistName,
            getSongsByGenre,
            revertLike,
            alertShow,
            toggleSong,
            toggleVolume,
            togglePlayMode,
            getNextSongId,
            getPrevSongId,
            nextSong,
            prevSong,
        };
    },
    {
        persist: {
            paths: ["albums", "songs", "sortBy", "volume", "playMode"],
        },
    },
);

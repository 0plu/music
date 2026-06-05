<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/index";
import { computed, nextTick, onMounted, ref, watch } from "vue";

const store = useStore(); // Pinia仓库实例
const {
    activeSong, // 当前播放的歌曲对象（含标题、封面、路径等信息）
    activeSongId, // 当前播放的歌曲ID，用于驱动切歌逻辑
    playMode, // 当前播放模式，用于控制ended及切歌行为
    volume, // 当前音量（0-100）
    lastVolume, // 静音前的音量，用于恢复音量时至少恢复到20
    isSongPlaying, // 是否正在播放歌曲
    songSeconds, // 当前播放进度（百分比0-100），用于驱动进度条
    isAudioLoading, // 音频是否仍在加载，避免资源未就绪时直接调用play
    audioError, // 最近一次音频加载或播放错误
} = storeToRefs(store); // storeToRefs保持响应性，解构后仍能与store同步
const {
    revertLike,
    prevSong,
    nextSong,
    toggleSong,
    toggleVolume,
    togglePlayMode,
} = store; // 方法直接解构，不需要响应性

/** 播放模式按钮使用短文本，避免增加控制栏宽度并保持现有UI稳定。 */
const playModeText = computed(() => {
    const labels = {
        sequence: "SEQ",
        single: "ONE",
        random: "RND",
    };
    return labels[playMode.value];
});

/** 完整模式名称用于按钮title，方便用户理解短文本含义。 */
const playModeTitle = computed(() => {
    const titles = {
        sequence: "Sequence",
        single: "Repeat one",
        random: "Random",
    };
    return titles[playMode.value];
});

/** 模板中的原生audio元素；使用模板ref避免依赖全局id查询。 */
const audioElement = ref<HTMLAudioElement | null>(null);
/** 切歌期间原生audio会触发pause，使用该标记避免把期望播放状态误改为暂停。 */
const isChangingSong = ref(false);

/**
 * 安全执行原生play。
 * play()会返回Promise，浏览器自动播放策略或资源异常都可能使其reject，必须回写Pinia状态。
 */
const playAudio = async () => {
    const audio = audioElement.value;
    if (!audio || isAudioLoading.value) return;

    try {
        await audio.play();
        audioError.value = "";
    } catch (error) {
        isSongPlaying.value = false;
        audioError.value =
            error instanceof Error ? error.message : "Audio playback failed";
    }
};

/** loadeddata表示资源已可播放，此时才根据Pinia中的期望状态执行play。 */
const handleLoadedData = () => {
    const audio = audioElement.value;
    if (!audio) return;

    isAudioLoading.value = false;
    isChangingSong.value = false;
    audioError.value = "";
    audio.currentTime = 0;
    songSeconds.value = 0;

    if (isSongPlaying.value) {
        void playAudio();
    }
};

/** 将原生播放进度换算为百分比回写Pinia，保证进度条始终反映真实播放位置。 */
const handleTimeUpdate = () => {
    const audio = audioElement.value;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        songSeconds.value = 0;
        return;
    }

    songSeconds.value = (audio.currentTime / audio.duration) * 100;
};

/** 当前模式仍选择同一首歌时，主动归零并播放，因为activeSongId不会触发切歌watch。 */
const restartCurrentSong = () => {
    const audio = audioElement.value;
    if (!audio) return;

    audio.currentTime = 0;
    songSeconds.value = 0;
    isSongPlaying.value = true;
    void playAudio();
};

/** 应用选歌action；目标未变化时原地重播，变化时等待loadeddata后自动播放。 */
const applySongSelection = (selectSong: () => number) => {
    const previousSongId = activeSongId.value;
    const selectedSongId = selectSong();

    if (selectedSongId === previousSongId) {
        restartCurrentSong();
        return;
    }

    isSongPlaying.value = true;
};

/** 原生音频播放结束后复用Store播放策略，自动处理顺序、单曲循环和随机播放。 */
const handleEnded = () => {
    applySongSelection(nextSong);
};

/** 将原生加载错误同步到Pinia，并停止继续播放，避免UI仍显示播放中。 */
const handleAudioError = () => {
    const mediaError = audioElement.value?.error;
    audioError.value = mediaError
        ? `Audio error code: ${mediaError.code}`
        : "Audio loading failed";
    isAudioLoading.value = false;
    isChangingSong.value = false;
    isSongPlaying.value = false;
};

/** 原生audio确实开始播放后回写状态，兼容浏览器或外部控制触发的播放。 */
const handleNativePlay = () => {
    isSongPlaying.value = true;
};

/** 非切歌导致的原生pause需要回写状态，避免按钮仍显示播放中。 */
const handleNativePause = () => {
    if (!isChangingSong.value) {
        isSongPlaying.value = false;
    }
};

/** 切换静音/恢复音量；实际audio.volume更新统一交给volume watcher。 */
const toggleVolumePlay = () => {
    toggleVolume();
};

/** 播放按钮只修改Pinia期望状态，原生播放/暂停统一由watch执行。 */
const toggleSongPlay = (songId: number) => {
    toggleSong(songId);
};

/** 上一首按钮切歌后声明继续播放，等待loadeddata再真正执行play。 */
const prevSongPlay = () => {
    applySongSelection(prevSong);
};

/** 下一首按钮切歌后声明继续播放，等待loadeddata再真正执行play。 */
const nextSongPlay = () => {
    applySongSelection(nextSong);
};

/** 拖动进度条时把Pinia中的百分比换算为秒并同步到原生audio。 */
const handleSeek = () => {
    const audio = audioElement.value;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        return;
    }

    const progress = Math.min(100, Math.max(0, songSeconds.value));
    audio.currentTime = (progress / 100) * audio.duration;
    songSeconds.value = progress;
};

// activeSongId变化代表切歌：先暂停和清零，等待Vue更新src后再主动加载新资源。
watch(
    activeSongId,
    async () => {
        const audio = audioElement.value;
        if (!audio) return;

        isChangingSong.value = true;
        isAudioLoading.value = true;
        audioError.value = "";
        songSeconds.value = 0;
        audio.pause();
        audio.currentTime = 0;

        await nextTick();
        audio.load();
    },
);

// Pinia是播放/暂停的唯一指令来源；加载中只记录意图，loadeddata后再执行play。
watch(isSongPlaying, (shouldPlay) => {
    const audio = audioElement.value;
    if (!audio) return;

    if (shouldPlay) {
        void playAudio();
    } else {
        audio.pause();
    }
});

// 将0-100的业务音量转换为原生audio需要的0-1，并记录静音前音量。
watch(
    volume,
    (newVolume, oldVolume) => {
        const audio = audioElement.value;
        if (audio) {
            audio.volume = Math.min(1, Math.max(0, newVolume / 100));
        }
        if (oldVolume !== undefined && oldVolume > 0) {
            lastVolume.value = oldVolume;
        }
    },
    { immediate: true },
);

// 组件挂载时初始化加载状态；真正播放仍需等待loadeddata事件。
onMounted(() => {
    const audio = audioElement.value;
    if (audio) {
        isAudioLoading.value = true;
        // immediate watcher执行时模板ref尚未挂载，因此这里补充应用首次音量。
        audio.volume = Math.min(1, Math.max(0, volume.value / 100));
        audio.load();
    }
});
</script>
<template>
    <template v-if="activeSong">
        <audio
            id="audio"
            ref="audioElement"
            :src="'songs/' + activeSong.songPath"
            preload="auto"
            @loadeddata="handleLoadedData"
            @timeupdate="handleTimeUpdate"
            @ended="handleEnded"
            @error="handleAudioError"
            @play="handleNativePlay"
            @pause="handleNativePause"
        >
            <p>Your browser does not support the <code>audio</code> element.</p>
        </audio>
        <div
            class="fixed bottom-0 left-0 z-30 grid w-screen grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 border-t-2 border-gray-lightest bg-gray-dark px-3 pb-3 pt-2 xs:flex xs:flex-row xs:justify-around xs:px-8 xs:py-3 sm:px-20"
        >
            <div
                class="flex min-w-0 flex-row items-center xs:mr-auto xs:basis-1/4"
            >
                <img
                    class="h-12 w-12 shrink-0 rounded-sm object-cover xs:h-16 xs:w-16"
                    :src="'album-covers/' + activeSong.imgPath"
                    alt=""
                />
                <div class="ml-2 flex min-w-0 flex-col">
                    <span class="truncate text-sm font-bold xs:text-lg">{{
                        activeSong.title
                    }}</span>
                    <span class="truncate text-xs text-gray-400">{{
                        activeSong.artistName
                    }}</span>
                </div>
                <button
                    @click="activeSong && revertLike(activeSong.id)"
                    class="ml-1 hidden h-11 w-11 shrink-0 items-center justify-center xs:ml-3 xs:flex"
                    aria-label="Toggle liked song"
                >
                    <img
                        :src="
                            activeSong.isLiked
                                ? 'heart-filled.png'
                                : 'heart.png'
                        "
                        class="h-8 w-8 p-1"
                        alt=""
                    />
                </button>
            </div>
            <button
                class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 xs:hidden"
                @click="activeSong && toggleSongPlay(activeSong.id)"
                :aria-label="isSongPlaying ? 'Pause' : 'Play'"
            >
                <img
                    :src="isSongPlaying ? './stop.png' : './play.png'"
                    :alt="isSongPlaying ? 'Pause' : 'Play'"
                    class="h-8 w-8 p-1"
                />
            </button>
            <div
                class="col-span-2 flex min-w-0 flex-col items-center xs:col-auto xs:basis-1/2"
            >
                <div
                    class="flex h-11 w-full max-w-xs flex-row items-center justify-center gap-4 xs:max-w-none xs:justify-evenly xs:gap-0"
                >
                    <button
                        @click="togglePlayMode"
                        :title="playModeTitle"
                        :aria-label="`Play mode: ${playModeTitle}`"
                        class="flex h-11 min-w-[2.75rem] items-center justify-center text-xs font-bold text-gray-300 hover:text-white"
                    >
                        {{ playModeText }}
                    </button>
                    <button
                        @click="prevSongPlay"
                        class="flex h-11 w-11 items-center justify-center"
                        aria-label="Previous song"
                    >
                        <img
                            src="@/assets/prev.png"
                            alt="Prev"
                            class="h-8 w-8 p-1"
                        />
                    </button>
                    <button
                        @click="activeSong && toggleSongPlay(activeSong.id)"
                        class="hidden h-11 w-11 items-center justify-center xs:flex"
                        :aria-label="isSongPlaying ? 'Pause' : 'Play'"
                    >
                        <img
                            :src="isSongPlaying ? './stop.png' : './play.png'"
                            :alt="isSongPlaying ? 'Pause' : 'Play'"
                            class="h-8 w-8 p-1"
                        />
                    </button>
                    <button
                        @click="nextSongPlay"
                        class="flex h-11 w-11 items-center justify-center"
                        aria-label="Next song"
                    >
                        <img
                            src="@/assets/next.png"
                            alt="Next"
                            class="h-8 w-8 p-1"
                        />
                    </button>
                </div>
                <input
                    type="range"
                    class="touch-slider h-6 w-full cursor-pointer appearance-none rounded bg-transparent accent-gray-300 outline-none hover:accent-primary-normal xs:mt-1 xs:w-3/4"
                    min="0"
                    max="100"
                    step=".01"
                    @input="handleSeek"
                    v-model.number="songSeconds"
                />
            </div>
            <div
                class="ml-auto my-auto hidden basis-1/4 flex-row items-center justify-end xs:flex"
            >
                <button
                    @click="toggleVolumePlay"
                    class="flex h-11 w-11 items-center justify-center"
                    aria-label="Toggle mute"
                >
                    <img
                        :src="volume == 0 ? 'muted.png' : 'volume.png'"
                        alt="Volume"
                        class="h-8 w-8 p-1"
                    />
                </button>
                <input
                    type="range"
                    class="touch-slider h-6 w-1/2 cursor-pointer appearance-none rounded bg-transparent text-right accent-gray-300 outline-none hover:accent-primary-normal"
                    min="0"
                    max="100"
                    step="0.01"
                    v-model.number="volume"
                />
            </div>
        </div>
    </template>
</template>

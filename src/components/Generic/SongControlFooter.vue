<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/index";
import { onMounted, watch } from "vue";

let audioElement: HTMLAudioElement; // 浏览器原生音频元素引用，在onMounted中赋值

const store = useStore(); // Pinia仓库实例
const {
    activeSong, // 当前播放的歌曲对象（含标题、封面、路径等信息）
    activeSongId, // 当前播放的歌曲ID，用于驱动切歌逻辑
    volume, // 当前音量（0-100）
    lastVolume, // 静音前的音量，用于恢复音量时至少恢复到20
    isSongPlaying, // 是否正在播放歌曲
    songSeconds, // 当前播放进度（百分比0-100），用于驱动进度条
} = storeToRefs(store); // storeToRefs保持响应性，解构后仍能与store同步
const { revertLike, prevSong, nextSong, toggleSong, toggleVolume } = store; // 方法直接解构，不需要响应性

/* MOUNTED */
onMounted(() => {
    /* WATCH */
    // 监听音量变化，同步到音频元素
    watch(
        () => volume?.value, // 监听store中的音量值
        (newVal, oldVal) => {
            audioElement.volume = newVal / 100; // store音量0-100，HTML音量0-1，需要除以100转换
            lastVolume.value = oldVal < 20 ? 20 : oldVal; // 记录旧音量，最小保持20（避免恢复时音量太小听不到）
        },
    );
    // 监听播放/暂停状态变化，同步到音频元素
    watch(
        () => isSongPlaying.value, // 监听store中的播放状态
        (newVal) => {
            if (newVal) {
                audioElement.play(); // true → 播放音频
            } else {
                audioElement.pause(); // false → 暂停音频
            }
        },
    );
    // 监听切歌：歌曲ID变化时，设置新歌加载完后从头播放
    watch(
        () => activeSongId.value, // 监听store中的当前歌曲ID
        () => {
            audioElement.onloadeddata = () => {
                // 新音频数据加载完成后的回调
                audioElement.currentTime = 0; // 从头开始播放
                audioElement.play(); // 自动播放新歌
            };
        },
    );
    // 通过ID获取模板中的<audio>元素，as HTMLAudioElement告诉TS这是音频元素
    audioElement = document.getElementById("audio") as HTMLAudioElement;
    // 音频数据加载完成后的回调：恢复上次播放进度
    audioElement.onloadeddata = () => {
        // 设置播放起始位置
        audioElement.currentTime =
            // 检查duration和songSeconds都不是NaN（防止数据未加载时计算出错）
            !isNaN(audioElement.duration) && !isNaN(songSeconds.value)
                ? // songSeconds是百分比0-100，乘以总时长再除以100，得到应该跳转到的秒数
                  Math.floor((songSeconds.value * audioElement.duration) / 100)
                : 0; // 数据未就绪时从头开始
        // 如果上次关闭时是播放状态，恢复播放
        if (isSongPlaying.value) {
            audioElement.play();
        }
    };
    // 播放过程中持续触发：将当前播放位置同步回store，驱动进度条更新
    audioElement.ontimeupdate = () => {
        // 将当前秒数转为百分比存入songSeconds
        songSeconds.value = isNaN(
            (audioElement.currentTime * 100) / audioElement.duration,
        )
            ? 0 // duration未加载时设为0，避免NaN
            : (audioElement.currentTime * 100) / audioElement.duration;
    };
    // 初始化音量，store中0-100转为HTML音频0-1
    audioElement.volume = volume.value / 100;
});
// 切换静音/恢复音量，并将新音量同步到音频元素
const toggleVolumePlay = () => {
    // 如果已经静音，就恢复音量并除100（0-1）
    // 如果未静音，就记住当前音量并置音量为0
    audioElement.volume = toggleVolume() / 100;
};
// 播放/暂停切换：暂停状态→播放，播放状态→暂停
const toggleSongPlay = (songId: number) => {
    audioElement.pause();
    if (!isSongPlaying.value) {
        toggleSong(songId);
        // audioElement.play();
    } else {
        isSongPlaying.value = false;
    }
};
// 上一首：设置新歌加载完后自动播放，然后切换到上一首
const prevSongPlay = () => {
    audioElement.onloadeddata = () => {
        audioElement.play();
    };
    toggleSong(prevSong());
};
// 下一首：设置新歌加载完后自动播放，然后切换到下一首
const nextSongPlay = () => {
    audioElement.onloadeddata = () => {
        audioElement.play();
    };
    toggleSong(nextSong());
};
// 拖动进度条后恢复播放：根据百分比计算秒数，从新位置开始播放
const resumePlaying = () => {
    audioElement.currentTime =
        (songSeconds.value / 100) * audioElement.duration;
    audioElement.play();
    isSongPlaying.value = true;
};
// const pausePlaying = () => {
//     audioElement.pause();
//     isSongPlaying.value = false;
// };
</script>
<template>
    <template v-if="activeSong">
        <audio
            id="audio"
            ref="audio"
            :src="'songs/' + activeSong.songPath"
            preload="auto"
            :onended="nextSongPlay"
        >
            <p>Your browser does not support the <code>audio</code> element.</p>
        </audio>
        <div
            class="fixed bottom-0 left-0 w-screen flex flex-row justify-around py-3 bg-gray-dark border-t-2 border-gray-lightest px-5 xs:px-20"
        >
            <div
                class="flex flex-row items-center mr-auto basis-1/2 xs:basis-1/4"
            >
                <img
                    class="w-16 h-16 hidden xs:block"
                    :src="'album-covers/' + activeSong.imgPath"
                />
                <div class="flex flex-col xs:ml-2">
                    <span class="text-lg font-bold">{{
                        activeSong.title
                    }}</span>
                    <span class="text-xs text-gray-400">{{
                        activeSong.artistName
                    }}</span>
                </div>
                <button
                    @click="activeSong && revertLike(activeSong.id)"
                    class="hidden xs:block xs:ml-5"
                >
                    <img
                        :src="
                            activeSong.isLiked
                                ? 'heart-filled.png'
                                : 'heart.png'
                        "
                        class="w-8 h-8 p-1"
                    />
                </button>
            </div>
            <div class="flex flex-col items-center basis-1/4 xs:basis-1/2">
                <div class="flex flex-row justify-evenly w-full">
                    <button @click="prevSongPlay">
                        <img
                            src="@/assets/prev.png"
                            alt="Prev"
                            class="w-8 h-8 p-1"
                        />
                    </button>
                    <button
                        @click="activeSong && toggleSongPlay(activeSong.id)"
                    >
                        <img
                            :src="isSongPlaying ? './stop.png' : './play.png'"
                            alt="Play"
                            class="w-8 h-8 p-1"
                        />
                    </button>
                    <button @click="nextSongPlay">
                        <img
                            src="@/assets/next.png"
                            alt="Next"
                            class="w-8 h-8 p-1"
                        />
                    </button>
                </div>
                <input
                    type="range"
                    class="w-3/4 h-1.5 bg-white accent-gray-300 rounded outline-none slider-thumb mt-4 cursor-pointer hover:accent-primary-normal"
                    min="0"
                    max="100"
                    step=".01"
                    @input="resumePlaying"
                    v-model="songSeconds"
                />
            </div>
            <div
                class="ml-auto my-auto items-center basis-1/4 flex flex-row justify-end"
            >
                <button @click="toggleVolumePlay">
                    <img
                        :src="volume == 0 ? 'muted.png' : 'volume.png'"
                        alt="Volume"
                        class="w-8 h-8 p-1 mr-2 hidden xs:block"
                    />
                </button>
                <input
                    type="range"
                    class="w-1/2 h-1 bg-white accent-gray-300 rounded outline-none slider-thumb text-right cursor-pointer hover:accent-primary-normal"
                    min="0"
                    max="100"
                    step="0.01"
                    v-model="volume"
                />
            </div>
        </div>
    </template>
</template>

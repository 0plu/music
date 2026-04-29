import { it, expect, describe, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useStore } from "./index";
import { convertDuration } from "@/utils/format";

// Node 环境中不存在 window，需要模拟 window.setTimeout
beforeEach(() => {
    let timerId = 0;
    vi.stubGlobal("window", {
        setTimeout: vi.fn((cb: () => void, _ms: number) => {
            timerId++;
            setTimeout(cb, _ms);
            return timerId;
        }),
    });
});

describe("时间转换工具函数", () => {
    it('125秒应该变成 "02:05"', () => {
        const result = convertDuration(125);
        expect(result).toBe("02:05");
    });

    it('个位数秒应该补0，如 5秒变成 "00:05"', () => {
        const result = convertDuration(5);
        expect(result).toBe("00:05");
    });
});

describe("Store 核心逻辑", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    describe("revertLike", () => {
        it("应该将未点赞的歌曲切换为已点赞，并弹出 Added 提示", () => {
            const store = useStore();
            // id=2 的歌曲 isLiked 初始为 false
            expect(store.songs.find((s) => s.id === 2)!.isLiked).toBe(false);

            store.revertLike(2);

            expect(store.songs.find((s) => s.id === 2)!.isLiked).toBe(true);
            expect(store.alertMessage).toBe("Added to Liked Songs");
        });

        it("应该将已点赞的歌曲切换为未点赞，并弹出 Removed 提示", () => {
            const store = useStore();
            // id=1 的歌曲 isLiked 初始为 true
            expect(store.songs.find((s) => s.id === 1)!.isLiked).toBe(true);

            store.revertLike(1);

            expect(store.songs.find((s) => s.id === 1)!.isLiked).toBe(false);
            expect(store.alertMessage).toBe("Removed from Liked Songs");
        });

        it("对不存在的歌曲ID调用应静默忽略，不抛异常", () => {
            const store = useStore();
            expect(() => store.revertLike(999)).not.toThrow();
            expect(store.alertMessage).toBe("");
        });
    });

    describe("nextSong", () => {
        it("应该切换到排序列表中的下一首歌曲", () => {
            const store = useStore();
            // 默认按 title 排序，列表顺序: Battery(7), Hardwired(8), Industry Baby(5)...
            store.activeSongId = 7; // Battery
            store.isSongPlaying = true;

            const nextId = store.nextSong();

            // 下一首应为 Hardwired(8)
            expect(nextId).toBe(8);
            expect(store.activeSongId).toBe(8);
            expect(store.isSongPlaying).toBe(false);
        });

        it("到达列表末尾时应循环回到第一首", () => {
            const store = useStore();
            // 按 title 排序，最后一首是 Without Me(id=1)
            const sortedList = store.songsWithAlbumName;
            const lastSong = sortedList[sortedList.length - 1];
            store.activeSongId = lastSong.id;

            const nextId = store.nextSong();

            // 应循环到第一首
            expect(nextId).toBe(sortedList[0].id);
        });

        it("切歌时应该重置播放进度", () => {
            const store = useStore();
            store.activeSongId = 7;
            store.songSeconds = 50;

            store.nextSong();

            expect(store.songSeconds).toBe(0);
        });
    });

    describe("prevSong", () => {
        it("应该切换到排序列表中的上一首歌曲", () => {
            const store = useStore();
            // 按 title 排序，Hardwired(8) 的上一首是 Battery(7)
            store.activeSongId = 8;

            const prevId = store.prevSong();

            expect(prevId).toBe(7);
            expect(store.activeSongId).toBe(7);
            expect(store.isSongPlaying).toBe(false);
        });

        it("到达列表开头时应循环到最后一首", () => {
            const store = useStore();
            // 按 title 排序，第一首是 Battery(id=7)
            const sortedList = store.songsWithAlbumName;
            const firstSong = sortedList[0];
            store.activeSongId = firstSong.id;

            const prevId = store.prevSong();

            // 应循环到最后一首
            expect(prevId).toBe(sortedList[sortedList.length - 1].id);
        });

        it("对不在列表中的歌曲ID应返回当前ID不变", () => {
            const store = useStore();
            store.activeSongId = 999;

            const result = store.prevSong();

            expect(result).toBe(999);
        });
    });
});

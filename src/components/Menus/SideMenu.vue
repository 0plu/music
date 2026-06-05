<script lang="ts" setup>
import sidemenu from "@/components/Menus/sidemenu.json";
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "@/stores/index";

const store = useStore();
const { albums } = store;

let route = ref(useRoute());
</script>
<template>
    <div class="min-h-screen w-16 shrink-0 bg-black pb-32 xs:w-40 xs:pb-28">
        <router-link to="/" class="flex h-16 items-center justify-center xs:h-auto">
            <img
                src="@/assets/hikotify-wide.png"
                class="mx-auto w-full p-2 xs:mb-5"
                alt="Logo"
            />
        </router-link>
        <div class="flex flex-col justify-center items-center">
            <router-link
                :to="item.route"
                v-for="(item, index) in sidemenu"
                :key="index"
                class="my-1 flex w-full cursor-pointer flex-row rounded-md p-2"
                :class="{ 'bg-primary-normal': item.route === route.path }"
                :title="item.name"
            >
                <div class="flex w-full justify-center xs:justify-start">
                    <div
                        class="inline-block h-8 w-8 shrink-0 bg-white xs:mr-3"
                        :style="{
                            '-webkit-mask':
                                'url(' +
                                item.icon +
                                '.svg) 0 0/32px 32px no-repeat',
                            mask:
                                'url(' +
                                item.icon +
                                '.svg) 0 0/32px 32px no-repeat',
                        }"
                    ></div>
                    <span class="my-auto hidden text-xl font-semibold xs:inline">{{
                        item.name
                    }}</span>
                </div>
            </router-link>
        </div>
        <hr class="my-3 xs:my-5" />
        <div class="flex flex-col justify-center items-center">
            <router-link
                to="/liked-songs"
                class="my-1 flex w-full cursor-pointer flex-row rounded-md p-2"
                title="喜爱的歌曲"
            >
                <div class="flex w-full items-center justify-center xs:justify-start">
                    <img
                        src="@/assets/liked.png"
                        alt="Liked"
                        class="inline-block h-10 w-10 shrink-0 xs:mr-3"
                    />
                    <span class="my-auto hidden text-md font-semibold xs:inline"
                        >喜爱的歌曲</span
                    >
                </div>
            </router-link>
            <router-link
                :to="'/albums/' + item.id"
                v-for="(item, index) in albums"
                :key="index"
                class="my-1 hidden w-full cursor-pointer flex-row rounded-md p-2 xs:flex"
            >
                <div class="flex justify-start w-full items-center">
                    <img
                        :src="'album-covers/' + item.image"
                        alt="Logo"
                        class="inline-block w-10 h-10 mr-3"
                    />
                    <span class="font-semibold my-auto text-md">{{
                        item.name
                    }}</span>
                </div>
            </router-link>
        </div>
    </div>
</template>

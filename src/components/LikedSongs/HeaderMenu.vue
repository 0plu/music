<script lang="ts" setup>
import HeaderGenericVue from "@/components/Generic/HeaderGeneric.vue";
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/index";

const store = useStore();
const { likedSongs } = storeToRefs(store);
</script>
<template>
    <div class="bg-gradient-to-b from-indigo-700 to-background">
        <HeaderGenericVue />
        <div class="mt-5 flex min-w-0 flex-col gap-4 p-4 xs:flex-row xs:flex-wrap xs:gap-5">
            <img
                src="@/assets/liked.png"
                alt="Liked"
                class="h-40 w-40 self-center rounded object-cover xs:h-60 xs:w-60 xs:self-auto"
            />
            <div class="flex min-w-0 flex-col justify-end">
                <span class="font-bold text-lg">Playlist</span>
                <h1 class="break-words text-3xl font-extrabold xs:text-6xl">Liked Songs</h1>
                <p class="text-sm mt-2">
                    {{ likedSongs.length }} songs are listed here.
                </p>
            </div>
        </div>
    </div>
</template>

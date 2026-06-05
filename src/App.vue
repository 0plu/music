<script setup lang="ts">
import { RouterView } from "vue-router";
import SideMenuVue from "@/components/Menus/SideMenu.vue";
import AlertGenericVue from "./components/Generic/AlertGeneric.vue";
import SongControlFooterVue from "./components/Generic/SongControlFooter.vue";

import { useRoute } from "vue-router";
import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/index";

const route = useRoute();

const store = useStore();
const { activeAlbumId, activeGenreId, activeSongId, isSongPlaying } =
    storeToRefs(store);
watch(
    () => route.params.albumId,
    (newValue) => {
        if (newValue) {
            activeGenreId.value = 0;
            activeAlbumId.value = parseInt(newValue.toString());
        }
    },
);
watch(
    () => route.params.genreId,
    (newValue) => {
        if (newValue) {
            activeAlbumId.value = 0;
            activeGenreId.value = parseInt(newValue.toString());
        }
    },
);

window.addEventListener("beforeunload", () => {
    isSongPlaying.value = false;
});
</script>

<template>
    <div class="flex flex-row text-white">
        <SideMenuVue />
        <RouterView
            class="min-h-screen min-w-0 max-w-[calc(100vw-4rem)] flex-1 overflow-x-hidden bg-background pb-32 text-base xs:max-w-[calc(100vw-10rem)] xs:pb-28"
        />
        <AlertGenericVue />
        <SongControlFooterVue v-if="activeSongId !== 0" />
    </div>
</template>

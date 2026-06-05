<script lang="ts" setup>
import HeaderMenuVue from "@/components/LikedSongs/HeaderMenu.vue";
import SongListVue from "@/components/LikedSongs/SongList.vue";
</script>
<template>
    <div class="flex min-w-0 flex-1 flex-col">
        <header>
            <HeaderMenuVue />
        </header>
        <main>
            <SongListVue />
        </main>
    </div>
</template>

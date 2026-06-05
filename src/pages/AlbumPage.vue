<script lang="ts" setup>
import HeaderMenuVue from "@/components/Album/HeaderMenu.vue";
import SongListVue from "@/components/Album/SongList.vue";
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

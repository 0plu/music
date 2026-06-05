<script setup lang="ts">
import HeaderMenuVue from "@/components/Menus/HeaderMenu.vue";
import GenreSongsVue from "@/components/Home/GenreSongs.vue";
</script>
<template>
    <div class="flex min-w-0 flex-1 flex-col">
        <header>
            <HeaderMenuVue />
        </header>
        <main>
            <GenreSongsVue />
        </main>
    </div>
</template>

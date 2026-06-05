<script lang="ts" setup>
import HeaderGenericVue from "@/components/Generic/HeaderGeneric.vue";
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/index";

const store = useStore();
const { activeAlbum } = storeToRefs(store);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const colors: any = {
    red: "from-red-700",
    yellow: "from-yellow-700",
    fuchsia: "from-fuchsia-700",
    orange: "from-orange-700",
    green: "from-green-700",
    cyan: "from-cyan-700",
    pink: "from-pink-700",
};
</script>
<template>
    <div
        v-if="activeAlbum"
        :class="`bg-gradient-to-b ${
            colors[activeAlbum.backgroundColor]
        } to-background`"
    >
        <HeaderGenericVue />
        <div class="mt-5 flex min-w-0 flex-col gap-4 p-4 xs:flex-row xs:flex-wrap xs:gap-5">
            <img
                :src="'album-covers/' + activeAlbum.image"
                alt="Liked"
                class="h-40 w-40 self-center rounded object-cover xs:h-60 xs:w-60 xs:self-auto"
            />
            <div class="flex min-w-0 flex-col justify-end">
                <span class="font-bold text-lg">专辑</span>
                <h1 class="break-words text-3xl font-extrabold xs:text-5xl">
                    {{ activeAlbum.name }}
                </h1>
                <p class="text-sm mt-2">
                    {{ activeAlbum.year }}
                </p>
            </div>
        </div>
    </div>
</template>

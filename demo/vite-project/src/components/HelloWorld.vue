<script setup lang="ts">
const test = index.name;
const count2 = index.innerCount;

function click() {
    ++count2.value;
}
const com = computed(() => count2.value * 2);
const count = ref(1100);
</script>

<template>
    <button @click="click">点击会增加{{com}}</button>
    <h4>{{ count2 }}</h4>
    <h4>{{ count }}</h4>
    <h2>{{ test }}</h2>
</template>

<style scoped lang="less">
h2 {
    color: red;
}
</style>

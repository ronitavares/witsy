<template>
  <ModalDialog id="docrepoconfig" ref="dialog" type="window" form="horizontal" :width="420" @save="onSave">
    <template #header>
      <div class="title">{{ t('docRepo.config.title') }}</div>
    </template>
    <template #body>
      <div class="group">
        <label>{{ t('docRepo.config.maxDocumentSize') }}</label>
        <input name="maxDocumentSizeMB" v-model="maxDocumentSizeMB" />&nbsp;&nbsp;{{ t('docRepo.config.millionCharacters') }}
      </div>
      <div class="group">
        <label>{{ t('docRepo.config.chunkSize') }}</label>
        <input name="chunkSize" v-model="chunkSize" />&nbsp;&nbsp;{{ t('docRepo.config.characters') }}
      </div>
      <div class="group">
        <label>{{ t('docRepo.config.chunkOverlap') }}</label>
        <input name="chunkOverlap" v-model="chunkOverlap" />&nbsp;&nbsp;{{ t('docRepo.config.characters') }}
      </div>
      <div class="group">
        <label>{{ t('docRepo.config.searchResultCount') }}</label>
        <input name="searchResultCount" v-model="searchResultCount" />
      </div>
      <div class="group">
        <label>{{ t('docRepo.config.relevanceCutOff') }}</label>
        <input name="relevanceCutOff" v-model="relevanceCutOff" />&nbsp;&nbsp;0 ≤ x ≤ 1
      </div>
    </template>
    <template #footer>
      <div class="buttons">
        <button name="cancel" @click="onCancel" formnovalidate>{{ t('common.cancel') }}</button>
        <button name="reset" @click.prevent="onReset" formnovalidate>{{ t('common.reset') }}</button>
        <button name="save" @click="onSave" class="default">{{ t('common.save') }}</button>
      </div>
    </template>
  </ModalDialog>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue'
import { store } from '../services/store'
import { t } from '../services/i18n'
import ModalDialog from '../components/ModalDialog.vue'
import defaultSettings from '../../defaults/settings.json'

// bus
import useEventBus from '../composables/event_bus'
const { onEvent } = useEventBus()

const dialog = ref(null)
const maxDocumentSizeMB = ref(null)
const chunkSize = ref(null)
const chunkOverlap = ref(null)
const searchResultCount = ref(null)
const relevanceCutOff = ref(null)

onMounted(() => {
  onEvent('open-docrepo-config', onOpen)
})

const onOpen = () => {
  dialog.value.show()
  load()
}

const load = () => {
  maxDocumentSizeMB.value = store.config.rag.maxDocumentSizeMB
  chunkSize.value = store.config.rag.chunkSize
  chunkOverlap.value = store.config.rag.chunkOverlap
  searchResultCount.value = store.config.rag.searchResultCount
  relevanceCutOff.value = store.config.rag.relevanceCutOff
}

const onReset = () => {
  maxDocumentSizeMB.value = defaultSettings.rag.maxDocumentSizeMB
  chunkSize.value = defaultSettings.rag.chunkSize
  chunkOverlap.value = defaultSettings.rag.chunkOverlap
  searchResultCount.value = defaultSettings.rag.searchResultCount
  relevanceCutOff.value = defaultSettings.rag.relevanceCutOff
}

const onSave = () => {
  store.config.rag.maxDocumentSizeMB = parseInt(maxDocumentSizeMB.value)
  store.config.rag.chunkSize = parseInt(chunkSize.value)
  store.config.rag.chunkOverlap = parseInt(chunkOverlap.value)
  store.config.rag.searchResultCount = parseInt(searchResultCount.value)
  store.config.rag.relevanceCutOff = parseFloat(relevanceCutOff.value)
  store.saveSettings()
  onCancel()
}

const onCancel = () => {
  dialog.value.close()
}

</script>

<style scoped>
@import '../../css/dialog.css';
@import '../../css/form.css';
</style>

<style scoped>
#docrepoconfig .group label {
  min-width: 200px;
}

#docrepoconfig .group input {
  max-width: 50px;
  text-align: right;
}
</style>
<script setup>
import { shallowRef, watch } from 'vue'
import { isRepoPath } from '@/utils/repoPath'
import { useToastsStore } from '@/stores/toasts'

const props = defineProps({
  project: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'cancel'])
const toasts = useToastsStore()

const provider = shallowRef('')
const repo = shallowRef('')
const branch = shallowRef('main')
const token = shallowRef('')
const baseUrl = shallowRef('')

const providerError = shallowRef('')
const repoError = shallowRef('')
const branchError = shallowRef('')

function isMissing(value) {
  return value == null || String(value).trim() === ''
}

watch(
  () => props.project,
  (project) => {
    provider.value = project?.provider ?? ''
    repo.value = project?.repo ?? ''
    branch.value = project?.branch ?? 'main'
    token.value = project?.token ?? ''
    baseUrl.value = project?.baseUrl ?? ''
    providerError.value = ''
    repoError.value = ''
    branchError.value = ''
  },
  { immediate: true },
)

function onSubmit() {
  const nextProvider = typeof provider.value === 'string' ? provider.value.trim() : provider.value
  const nextRepo = typeof repo.value === 'string' ? repo.value.trim() : repo.value
  const nextBranch = typeof branch.value === 'string' ? branch.value.trim() : branch.value

  providerError.value = isMissing(nextProvider) ? 'Обовʼязкове поле' : ''
  repoError.value = isMissing(nextRepo)
    ? 'Обовʼязкове поле'
    : isRepoPath(nextRepo)
      ? ''
      : 'Вкажіть owner/repo, наприклад makshc2/my-project'
  branchError.value = isMissing(nextBranch) ? 'Обовʼязкове поле' : ''

  if (isMissing(nextProvider) || isMissing(nextRepo) || isMissing(nextBranch) || !isRepoPath(nextRepo)) {
    toasts.error(
      [providerError.value, repoError.value, branchError.value].find((item) => item) || 'Перевірте форму',
    )
    return
  }

  const data = {
    provider: nextProvider,
    repo: nextRepo,
    branch: nextBranch,
  }

  if (!isMissing(token.value)) {
    data.token = typeof token.value === 'string' ? token.value.trim() : token.value
  }

  if (nextProvider === 'gitlab' && !isMissing(baseUrl.value)) {
    data.baseUrl = typeof baseUrl.value === 'string' ? baseUrl.value.trim() : baseUrl.value
  }

  emit('save', data)
}

function onCancel() {
  emit('cancel')
}
</script>

<template>
  <form class="project-form" @submit.prevent="onSubmit">
    <div>
      <label for="project-form-provider">Провайдер</label>
      <select id="project-form-provider" v-model="provider" name="provider">
        <option value="">
          Оберіть
        </option>
        <option value="github">
          GitHub
        </option>
        <option value="gitlab">
          GitLab
        </option>
      </select>
      <p v-if="providerError">
        {{ providerError }}
      </p>
    </div>
    <div>
      <label for="project-form-repo">Репозиторій</label>
      <input
        id="project-form-repo"
        v-model="repo"
        type="text"
        name="repo"
        placeholder="owner/repo"
      >
      <p v-if="repoError">
        {{ repoError }}
      </p>
    </div>
    <div>
      <label for="project-form-branch">Гілка</label>
      <input id="project-form-branch" v-model="branch" type="text" name="branch">
      <p v-if="branchError">
        {{ branchError }}
      </p>
    </div>
    <div>
      <label for="project-form-token">Токен</label>
      <input id="project-form-token" v-model="token" type="password" name="token">
    </div>
    <div v-if="provider === 'gitlab'">
      <label for="project-form-base-url">Base URL</label>
      <input id="project-form-base-url" v-model="baseUrl" type="text" name="baseUrl">
    </div>
    <div>
      <button type="submit">
        Зберегти
      </button>
      <button type="button" @click="onCancel">
        Скасувати
      </button>
    </div>
  </form>
</template>

<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    class="attachment-preview-dialog"
    :close-on-click-modal="false"
  >
    <div v-if="attachment" class="preview-container">
      <!-- 文件信息头部 -->
      <div class="file-header">
        <div class="file-info">
          <el-icon class="file-icon" :size="24">
            <component :is="getFileIcon(attachment.fileName)" />
          </el-icon>
          <div class="file-details">
            <div class="file-name" :title="attachment.fileName">
              {{ attachment.fileName }}
            </div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(attachment.fileSize) }}</span>
              <span class="file-type">{{ getFileType(attachment.fileName) }}</span>
              <span v-if="attachment.contentType" class="content-type">
                {{ attachment.contentType }}
              </span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <el-button type="primary" size="small" :loading="downloading" @click="handleDownload">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </div>
      </div>

      <!-- 预览内容区域 -->
      <div class="preview-content">
        <!-- 图片预览 -->
        <div v-if="previewType === 'image'" class="image-preview">
          <el-image
            :src="previewUrl"
            fit="contain"
            :preview-src-list="[previewUrl]"
            :initial-index="0"
            :z-index="3000"
            class="preview-image"
            @error="handlePreviewError"
          >
            <template #error>
              <div class="image-error">
                <el-icon :size="40"><Picture /></el-icon>
                <div>图片加载失败</div>
              </div>
            </template>
          </el-image>
        </div>

        <!-- 文本预览 -->
        <div v-else-if="previewType === 'text'" class="text-preview">
          <div class="text-toolbar">
            <el-button-group size="small">
              <el-button :type="textWrap ? 'primary' : ''" @click="textWrap = !textWrap">
                <el-icon><Grid /></el-icon>
                自动换行
              </el-button>
              <el-button @click="copyText">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
            </el-button-group>
          </div>
          <div class="text-content" :class="{ 'text-wrap': textWrap }">
            <pre v-if="textContent" class="text-pre">{{ textContent }}</pre>
            <div v-else-if="textLoading" class="text-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            <div v-else class="text-error">
              <el-icon><Warning /></el-icon>
              <span>文本加载失败</span>
            </div>
          </div>
        </div>

        <!-- PDF预览 -->
        <div v-else-if="previewType === 'pdf'" class="pdf-preview">
          <div class="pdf-toolbar">
            <span class="pdf-info">PDF文档预览</span>
            <el-button size="small" @click="openInNewTab">
              <el-icon><View /></el-icon>
              新窗口打开
            </el-button>
          </div>
          <iframe
            :src="previewUrl"
            class="pdf-iframe"
            frameborder="0"
            @error="handlePreviewError"
          ></iframe>
        </div>

        <!-- HTML预览 */
        <div v-else-if="previewType === 'html'" class="html-preview">
          <div class="html-toolbar">
            <el-button-group size="small">
              <el-button :type="htmlMode === 'rendered' ? 'primary' : ''" @click="htmlMode = 'rendered'">
                渲染视图
              </el-button>
              <el-button :type="htmlMode === 'source' ? 'primary' : ''" @click="htmlMode = 'source'">
                源码视图
              </el-button>
            </el-button-group>
          </div>
          <div class="html-content">
            <iframe
              v-if="htmlMode === 'rendered'"
              :srcdoc="htmlContent"
              class="html-iframe"
              sandbox="allow-same-origin"
            />
            <pre v-else class="html-source">{{ htmlContent }}</pre>
          </div>
        </div>

        <!-- 不支持预览 -->
        <div v-else class="unsupported-preview">
          <div class="unsupported-content">
            <el-icon :size="60" color="#dcdde0">
              <component :is="getFileIcon(attachment.fileName)" />
            </el-icon>
            <div class="unsupported-text">
              <h3>不支持预览</h3>
              <p>{{ attachment.fileName }}</p>
              <p class="tip">该文件类型不支持在线预览，请下载后查看</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="downloading" @click="handleDownload">
          下载文件
        </el-button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download,
  Picture,
  Grid,
  CopyDocument,
  Loading,
  Warning,
  View,
  Document,
  VideoPlay,
  Headphone,
  Files
} from '@element-plus/icons-vue'
import { Dialog } from '@/components/Dialog'
import { formatFileSize } from '@/utils/eml'
import type { EmailAttachment } from '@/types/eml/email'

// Props & Emits
interface Props {
  modelValue: boolean
  attachment?: EmailAttachment
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'download', attachment: EmailAttachment): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const downloading = ref(false)
const textContent = ref('')
const textLoading = ref(false)
const textWrap = ref(true)
const htmlContent = ref('')
const htmlMode = ref<'rendered' | 'source'>('rendered')

// 计算属性
const dialogTitle = computed(() => {
  if (!props.attachment) return '文件预览'
  return `预览: ${props.attachment.fileName}`
})

const previewType = computed(() => {
  if (!props.attachment) return 'unsupported'

  const ext = getFileExtension(props.attachment.fileName)

  // 图片文件
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'image'
  }

  // 文本文件
  if (['txt', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'css', 'html', 'htm', 'md'].includes(ext)) {
    return ext === 'html' || ext === 'htm' ? 'html' : 'text'
  }

  // PDF文件
  if (ext === 'pdf') {
    return 'pdf'
  }

  return 'unsupported'
})

const previewUrl = computed(() => {
  if (!props.attachment) return ''
  return props.attachment.downloadUrl
})

// 方法
const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

const getFileIcon = (fileName: string) => {
  const ext = getFileExtension(fileName)

  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return Picture
  }

  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) {
    return VideoPlay
  }

  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
    return Headphone
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return Files
  }

  return Document
}

const getFileType = (fileName: string): string => {
  const ext = getFileExtension(fileName)
  return ext.toUpperCase()
}

const loadTextContent = async () => {
  if (!props.attachment || previewType.value !== 'text') return

  textLoading.value = true
  try {
    const response = await fetch(props.attachment.downloadUrl)
    const text = await response.text()
    textContent.value = text
  } catch (error) {
    console.error('加载文本内容失败:', error)
    ElMessage.error('文本内容加载失败')
  } finally {
    textLoading.value = false
  }
}

const loadHtmlContent = async () => {
  if (!props.attachment || previewType.value !== 'html') return

  try {
    const response = await fetch(props.attachment.downloadUrl)
    const text = await response.text()
    htmlContent.value = text
  } catch (error) {
    console.error('加载HTML内容失败:', error)
    ElMessage.error('HTML内容加载失败')
  }
}

const copyText = async () => {
  if (!textContent.value) return

  try {
    await navigator.clipboard.writeText(textContent.value)
    ElMessage.success('文本已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const openInNewTab = () => {
  if (props.attachment?.downloadUrl) {
    window.open(props.attachment.downloadUrl, '_blank')
  }
}

const handleDownload = () => {
  if (props.attachment) {
    emit('download', props.attachment)
  }
}

const handlePreviewError = () => {
  ElMessage.error('预览加载失败')
}

// 监听attachment变化，加载内容
watch(
  () => props.attachment,
  (newAttachment) => {
    if (newAttachment && props.modelValue) {
      if (previewType.value === 'text') {
        loadTextContent()
      } else if (previewType.value === 'html') {
        loadHtmlContent()
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.attachment) {
      if (previewType.value === 'text') {
        loadTextContent()
      } else if (previewType.value === 'html') {
        loadHtmlContent()
      }
    }
  }
)
</script>

<style lang="scss" scoped>
.attachment-preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.preview-container {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-lighter);

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;

    .file-icon {
      color: var(--el-color-primary);
      flex-shrink: 0;
    }

    .file-details {
      flex: 1;
      min-width: 0;

      .file-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 4px;
      }

      .file-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--el-text-color-secondary);

        .file-type {
          padding: 2px 6px;
          background-color: var(--el-fill-color);
          border-radius: 4px;
        }
      }
    }
  }
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 图片预览样式 */
.image-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-light);

  .preview-image {
    max-width: 100%;
    max-height: 100%;

    :deep(.el-image__inner) {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--el-text-color-secondary);
  }
}

/* 文本预览样式 */
.text-preview {
  flex: 1;
  display: flex;
  flex-direction: column;

  .text-toolbar {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-fill-color-lighter);
  }

  .text-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
    background-color: var(--el-bg-color);

    .text-pre {
      margin: 0;
      padding: 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: var(--el-text-color-primary);
      white-space: pre;
    }

    &.text-wrap .text-pre {
      white-space: pre-wrap;
    }

    .text-loading,
    .text-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 200px;
      color: var(--el-text-color-secondary);
    }
  }
}

// PDF预览样式
.pdf-preview {
  flex: 1;
  display: flex;
  flex-direction: column;

  .pdf-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-fill-color-lighter);

    .pdf-info {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .pdf-iframe {
    flex: 1;
    width: 100%;
    border: none;
  }
}

// HTML预览样式
.html-preview {
  flex: 1;
  display: flex;
  flex-direction: column;

  .html-toolbar {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-fill-color-lighter);
  }

  .html-content {
    flex: 1;
    overflow: auto;

    .html-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .html-source {
      margin: 0;
      padding: 16px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: var(--el-text-color-primary);
      background-color: var(--el-bg-color);
      overflow: auto;
      height: 100%;
    }
  }
}

// 不支持预览样式
.unsupported-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .unsupported-content {
    text-align: center;

    .unsupported-text {
      margin-top: 16px;

      h3 {
        margin: 0 0 8px 0;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 4px 0;
        color: var(--el-text-color-regular);

        &.tip {
          color: var(--el-text-color-secondary);
          font-size: 14px;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

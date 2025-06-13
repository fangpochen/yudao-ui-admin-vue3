<template>
  <Dialog
    v-model="dialogVisible"
    title="上传邮件压缩包"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="upload-container">
      <!-- 上传区域 -->
      <div
        class="upload-dragger"
        :class="{
          'is-dragover': isDragOver,
          'is-uploading': uploading
        }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @click="handleClick"
      >
        <el-icon class="upload-icon" :size="50">
          <Upload />
        </el-icon>
        <div class="upload-text">
          <div class="upload-title">
            {{ uploading ? '正在上传...' : '点击或拖拽文件到此区域上传' }}
          </div>
          <div class="upload-hint">
            仅支持 .zip 格式的压缩文件，文件大小不超过 {{ maxSizeMB }}MB
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".zip"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>

      <!-- 文件信息 -->
      <div v-if="selectedFile" class="file-info">
        <div class="file-item">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
          <el-button v-if="!uploading" type="text" size="small" icon="Delete" @click="clearFile" />
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-progress
          :percentage="uploadProgress"
          :stroke-width="8"
          :text-inside="true"
          status="success"
        />
        <div class="progress-info">
          <span>{{ uploadProgressText }}</span>
          <el-button type="text" size="small" @click="cancelUpload"> 取消上传 </el-button>
        </div>
      </div>

      <!-- 上传结果 -->
      <div v-if="uploadResult" class="upload-result">
        <el-alert
          :type="uploadResult.success ? 'success' : 'error'"
          :title="uploadResult.message"
          :description="uploadResult.description"
          show-icon
          :closable="false"
        />

        <div v-if="uploadResult.success && uploadResult.data" class="result-details">
          <div class="result-item">
            <span class="label">批次名称：</span>
            <span>{{ uploadResult.data.batchName }}</span>
          </div>
          <div class="result-item">
            <span class="label">总文件数：</span>
            <span>{{ uploadResult.data.totalFiles }}</span>
          </div>
          <div class="result-item">
            <span class="label">成功解析：</span>
            <span class="success-count">{{ uploadResult.data.successCount }}</span>
          </div>
          <div
            v-if="uploadResult.data?.failureCount && uploadResult.data.failureCount > 0"
            class="result-item"
          >
            <span class="label">解析失败：</span>
            <span class="error-count">{{ uploadResult.data.failureCount }}</span>
            <el-button type="text" size="small" @click="$emit('view-errors', uploadResult.data.id)">
              查看错误
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ uploading ? '最小化' : '关闭' }}
        </el-button>
        <el-button
          v-if="selectedFile && !uploading && !uploadResult"
          type="primary"
          @click="handleUpload"
        >
          开始上传
        </el-button>
        <el-button v-if="uploadResult" type="primary" @click="handleComplete"> 完成 </el-button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document, Delete } from '@element-plus/icons-vue'
import { Dialog } from '@/components/Dialog'
import { uploadZipFile, getImportStatus } from '@/api/eml/import'
import { formatFileSize } from '@/utils/eml'
import type { ImportBatch } from '@/types/eml/import'

// 接口定义
interface UploadResult {
  success: boolean
  message: string
  description?: string
  data?: ImportBatch
}

// Props & Emits
interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'upload-success', batch: ImportBatch): void
  (e: 'view-errors', batchId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadProgressText = ref('')
const uploadResult = ref<UploadResult | null>(null)
const isDragOver = ref(false)
const uploadAbortController = ref<AbortController | null>(null)
const isPolling = ref(false)
const pollingTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const parseProgress = ref<ImportBatch | null>(null)

// 配置常量
const maxSizeMB = 100
const maxSizeBytes = maxSizeMB * 1024 * 1024

// 方法
const clearFile = () => {
  selectedFile.value = null
  uploadResult.value = null
  parseProgress.value = null
  stopPolling()
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const validateFile = (file: File): string | null => {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return '请选择 .zip 格式的压缩文件'
  }
  if (file.size > maxSizeBytes) {
    return `文件大小不能超过 ${maxSizeMB}MB`
  }
  return null
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectFile(file)
  }
}

const selectFile = (file: File) => {
  const error = validateFile(file)
  if (error) {
    ElMessage.error(error)
    return
  }

  selectedFile.value = file
  uploadResult.value = null
}

const handleClick = () => {
  if (!uploading.value) {
    fileInputRef.value?.click()
  }
}

// 拖拽事件处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false

  if (uploading.value) return

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    selectFile(files[0])
  }
}

// 上传处理
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  uploading.value = true
  uploadProgress.value = 0
  uploadProgressText.value = '准备上传...'
  uploadAbortController.value = new AbortController()

  try {
    const result = await uploadZipFile(selectedFile.value, (progressEvent: any) => {
      if (progressEvent.total) {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        uploadProgressText.value = `上传中... ${uploadProgress.value}%`
      }
    })

    uploadResult.value = {
      success: true,
      message: '上传成功！',
      description: '文件已成功上传并开始解析',
      data: result.data
    }

    emit('upload-success', result.data)
    
    // 开始轮询解析状态
    startPolling(result.data.id)
  } catch (error: any) {
    if (error.name === 'AbortError') {
      uploadResult.value = {
        success: false,
        message: '上传已取消',
        description: '用户主动取消了上传操作'
      }
    } else {
      uploadResult.value = {
        success: false,
        message: '上传失败',
        description: error.message || '文件上传过程中发生错误，请重试'
      }
    }
  } finally {
    uploading.value = false
    uploadAbortController.value = null
  }
}

const cancelUpload = () => {
  if (uploadAbortController.value) {
    uploadAbortController.value.abort()
  }
}

const handleClose = () => {
  if (uploading.value) {
    // 最小化模式，保持上传继续
    dialogVisible.value = false
  } else {
    // 完全关闭
    clearFile()
    dialogVisible.value = false
  }
}

const handleComplete = () => {
  clearFile()
  stopPolling()
  dialogVisible.value = false
}

// 轮询相关方法
const startPolling = (batchId: number) => {
  if (isPolling.value) {
    console.warn('轮询已在进行中，忽略重复启动')
    return
  }
  
  isPolling.value = true
  uploadProgressText.value = '正在解析邮件...'
  console.log('开始轮询状态, batchId:', batchId)
  
  let pollCount = 0
  const maxPollCount = 150 // 最多轮询5分钟 (150 * 2s = 300s)
  
  const poll = async () => {
    pollCount++
    console.log(`第${pollCount}次轮询, batchId: ${batchId}`)
    
    // 防止无限轮询
    if (pollCount > maxPollCount) {
      console.error('轮询超时，强制停止')
      stopPolling()
             uploadResult.value = {
         success: false,
         message: '轮询超时',
         description: '解析时间过长，请检查后端日志或重试',
         data: parseProgress.value || undefined
       }
      uploading.value = false
      return
    }
    try {
      const result = await getImportStatus(batchId)
      console.log('API返回原始数据:', result)
      
      // 安全地获取数据 - 处理不同的响应格式
      const data = result.data || result
      if (!data) {
        console.error('API返回数据为空:', result)
        throw new Error('API返回数据格式错误')
      }
      
      parseProgress.value = data
      
      // 安全地解构数据
      const status = data.status ?? 0
      const totalFiles = data.totalFiles ?? 0
      const successCount = data.successCount ?? 0
      const failCount = data.failCount ?? 0
      
      console.log('轮询状态:', { status, totalFiles, successCount, failCount, batchId })
      
      // 检查是否完成 - 移到前面，避免无用的进度更新
      if (status === 2 || status === 3 || status === 4) { // SUCCESS, PARTIAL_FAILED, FAILED
        console.log('任务完成，停止轮询, status:', status)
        stopPolling()
        uploadProgress.value = 100
        
        // 处理特殊情况：totalFiles为0表示ZIP中没有EML文件
        let finalDescription = ''
        if (totalFiles === 0) {
          finalDescription = 'ZIP文件中未找到.eml邮件文件，请检查文件内容'
        } else if (status === 2) {
          finalDescription = `成功解析 ${successCount} 个邮件文件`
        } else if (status === 3) {
          finalDescription = `成功解析 ${successCount} 个，失败 ${failCount} 个邮件文件`
        } else {
          finalDescription = '邮件解析过程中发生错误'
        }
        
        // 更新最终结果
        uploadResult.value = {
          success: status !== 4 && totalFiles > 0, // totalFiles=0也应该算作问题
          message: totalFiles === 0 ? '未找到邮件文件' : 
                   status === 2 ? '解析完成！' : 
                   status === 3 ? '部分解析成功' : '解析失败',
          description: finalDescription,
          data: data
        }
        
        uploadProgressText.value = '解析完成'
        uploading.value = false // 确保上传状态结束
        return
      }
      
      // 任务进行中，更新进度
      if (totalFiles > 0) {
        const processedCount = successCount + failCount
        const progressPercent = Math.round((processedCount / totalFiles) * 100)
        uploadProgress.value = Math.min(progressPercent, 99) // 防止显示100%但未完成
        uploadProgressText.value = `解析中...已处理 ${processedCount}/${totalFiles} 个文件`
      } else {
        uploadProgressText.value = '正在扫描ZIP文件中的邮件...'
      }
      
      // 继续轮询
      if (isPolling.value) { // 额外检查轮询状态
        pollingTimer.value = setTimeout(poll, 2000) // 每2秒轮询一次
      }
      
    } catch (error: any) {
      console.error('轮询状态失败:', error)
      console.error('错误详情:', error.message, error.stack)
      
      // 连续失败3次就停止轮询
      pollCount += 2 // 加重失败的计数
      if (pollCount > maxPollCount - 10) {
        console.error('轮询失败次数过多，停止轮询')
        stopPolling()
        uploadResult.value = {
          success: false,
          message: '轮询失败',
          description: `网络错误或服务异常: ${error.message}`,
          data: parseProgress.value || undefined
        }
        uploading.value = false
        return
      }
      
      // 轮询失败时继续重试，但降低频率
      if (isPolling.value) {
        console.log('5秒后重试轮询...')
        pollingTimer.value = setTimeout(poll, 5000) // 错误时每5秒轮询一次
      }
    }
  }
  
  // 立即执行第一次轮询
  poll()
}

const stopPolling = () => {
  console.log('停止轮询')
  isPolling.value = false
  if (pollingTimer.value) {
    clearTimeout(pollingTimer.value)
    pollingTimer.value = null
  }
}

// 组件销毁时清理轮询
onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style lang="scss" scoped>
.upload-container {
  padding: 20px 0;
}

.upload-dragger {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--el-fill-color-light);

  &:hover {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  &.is-dragover {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    transform: scale(1.02);
  }

  &.is-uploading {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.upload-icon {
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

.upload-text {
  .upload-title {
    font-size: 16px;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .upload-hint {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.file-info {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;

  .file-name {
    flex: 1;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .file-size {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
}

.upload-progress {
  margin-top: 20px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.upload-result {
  margin-top: 20px;
}

.result-details {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  .label {
    font-weight: 500;
    color: var(--el-text-color-primary);
    min-width: 80px;
  }

  .success-count {
    color: var(--el-color-success);
    font-weight: 500;
  }

  .error-count {
    color: var(--el-color-danger);
    font-weight: 500;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

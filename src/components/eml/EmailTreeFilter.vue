<template>
  <div class="email-tree-filter">
    <div class="tree-header">
      <div class="header-title">
        <el-icon><FolderOpened /></el-icon>
        <span>文件目录</span>
      </div>
      <div class="header-actions">
        <el-tooltip content="展开全部">
          <el-button type="text" size="small" @click="expandAll">
            <el-icon><ArrowDown /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="收起全部">
          <el-button type="text" size="small" @click="collapseAll">
            <el-icon><ArrowUp /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="刷新">
          <el-button type="text" size="small" @click="refreshTree">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="tree-search">
      <el-input
        v-model="searchText"
        placeholder="搜索文件路径..."
        size="small"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="tree-content">
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        :filter-node-method="filterNode"
        :expand-on-click-node="false"
        :check-on-click-node="checkOnClickNode"
        :show-checkbox="multiple"
        :check-strictly="checkStrictly"
        :default-checked-keys="defaultCheckedKeys"
        :default-expanded-keys="defaultExpandedKeys"
        node-key="path"
        highlight-current
        @check="handleCheck"
        @node-click="handleNodeClick"
        @current-change="handleCurrentChange"
      >
        <template #default="{ data }">
          <div class="tree-node">
            <div class="node-content">
              <el-icon class="node-icon">
                <component :is="getNodeIcon(data)" />
              </el-icon>
              <span class="node-label" :title="data.label">{{ data.label }}</span>
              <span v-if="data.count" class="node-count">({{ data.count }})</span>
            </div>
            <div v-if="data.isFile" class="node-actions">
              <el-tooltip content="查看邮件详情">
                <el-button type="text" size="small" @click.stop="$emit('view-email', data.emailId)">
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </template>
      </el-tree>

      <div v-if="loading" class="tree-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-if="!loading && (!treeData || treeData.length === 0)" class="tree-empty">
        <el-empty description="暂无数据" :image-size="80" />
      </div>
    </div>

    <div v-if="multiple" class="tree-footer">
      <div class="selected-info"> 已选择: {{ selectedCount }} 项 </div>
      <div class="footer-actions">
        <el-button size="small" @click="clearSelection">清空选择</el-button>
        <el-button type="primary" size="small" @click="confirmSelection"> 确认选择 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElTree } from 'element-plus'
import {
  FolderOpened,
  Folder,
  Document,
  ArrowDown,
  ArrowUp,
  Refresh,
  Search,
  View,
  Loading
} from '@element-plus/icons-vue'
import { buildEmailPathTree } from '@/utils/eml'

// 树节点数据结构
interface TreeNode {
  path: string
  label: string
  children?: TreeNode[]
  isFile: boolean
  emailId?: number
  count?: number
  parentPath?: string
}

// Props & Emits
interface Props {
  // 数据源 - 邮件数据数组
  emails?: Array<{
    id: number
    originalPath: string
    subject: string
  }>
  // 是否多选模式
  multiple?: boolean
  // 是否严格模式（父子节点不关联）
  checkStrictly?: boolean
  // 默认选中的路径
  defaultSelectedPaths?: string[]
  // 默认展开的路径
  defaultExpandedPaths?: string[]
  // 点击节点时是否选中
  checkOnClickNode?: boolean
  // 是否显示计数
  showCount?: boolean
}

interface Emits {
  (e: 'selection-change', paths: string[], nodes: TreeNode[]): void
  (e: 'current-change', path: string | null, node: TreeNode | null): void
  (e: 'view-email', emailId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  checkStrictly: false,
  checkOnClickNode: false,
  showCount: true,
  defaultSelectedPaths: () => [],
  defaultExpandedPaths: () => []
})

const emit = defineEmits<Emits>()

// 响应式数据
const treeRef = ref<InstanceType<typeof ElTree>>()
const searchText = ref('')
const loading = ref(false)
const treeData = ref<TreeNode[]>([])

// 树组件配置
const treeProps = {
  children: 'children',
  label: 'label',
  disabled: 'disabled'
}

// 计算属性
const defaultCheckedKeys = computed(() => props.defaultSelectedPaths)
const defaultExpandedKeys = computed(() => props.defaultExpandedPaths)
const selectedCount = computed(() => {
  if (!props.multiple || !treeRef.value) return 0
  return treeRef.value.getCheckedKeys().length
})

// 监听数据变化
watch(() => props.emails, buildTree, { immediate: true, deep: true })
watch(searchText, (val) => {
  treeRef.value?.filter(val)
})

// 方法
const buildTree = async () => {
  if (!props.emails || props.emails.length === 0) {
    treeData.value = []
    return
  }

  loading.value = true
  try {
    // 使用工具函数构建树结构
    treeData.value = buildEmailPathTree(props.emails, props.showCount)
  } catch (error) {
    console.error('构建文件树失败:', error)
    treeData.value = []
  } finally {
    loading.value = false
  }
}

const getNodeIcon = (data: TreeNode) => {
  if (data.isFile) {
    return Document
  }
  return data.children && data.children.length > 0 ? FolderOpened : Folder
}

const filterNode = (value: string, data: TreeNode) => {
  if (!value) return true
  return (
    data.label.toLowerCase().includes(value.toLowerCase()) ||
    data.path.toLowerCase().includes(value.toLowerCase())
  )
}

const handleSearch = () => {
  // 搜索逻辑在watch中处理
}

const expandAll = () => {
  const allKeys = getAllNodeKeys(treeData.value)
  treeRef.value?.setExpandedKeys(allKeys)
}

const collapseAll = () => {
  treeRef.value?.setExpandedKeys([])
}

const getAllNodeKeys = (nodes: TreeNode[]): string[] => {
  const keys: string[] = []
  const traverse = (nodeList: TreeNode[]) => {
    nodeList.forEach((node) => {
      keys.push(node.path)
      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }
  traverse(nodes)
  return keys
}

const refreshTree = () => {
  buildTree()
}

const handleCheck = (data: TreeNode, checkedInfo: any) => {
  if (props.multiple) {
    const checkedNodes = treeRef.value?.getCheckedNodes() || []
    const checkedKeys = treeRef.value?.getCheckedKeys() || []
    emit('selection-change', checkedKeys as string[], checkedNodes as TreeNode[])
  }
}

const handleNodeClick = (data: TreeNode) => {
  if (!props.multiple) {
    emit('selection-change', [data.path], [data])
  }
}

const handleCurrentChange = (data: TreeNode | null) => {
  if (data) {
    emit('current-change', data.path, data)
  } else {
    emit('current-change', null, null)
  }
}

const clearSelection = () => {
  if (props.multiple) {
    treeRef.value?.setCheckedKeys([])
    emit('selection-change', [], [])
  }
}

const confirmSelection = () => {
  if (props.multiple) {
    const checkedNodes = treeRef.value?.getCheckedNodes() || []
    const checkedKeys = treeRef.value?.getCheckedKeys() || []
    emit('selection-change', checkedKeys as string[], checkedNodes as TreeNode[])
  }
}

// 公开方法
const getSelectedPaths = () => {
  if (props.multiple) {
    return treeRef.value?.getCheckedKeys() || []
  } else {
    const currentNode = treeRef.value?.getCurrentNode()
    return currentNode ? [currentNode.path] : []
  }
}

const setSelectedPaths = (paths: string[]) => {
  if (props.multiple) {
    treeRef.value?.setCheckedKeys(paths)
  } else if (paths.length > 0) {
    treeRef.value?.setCurrentKey(paths[0])
  }
}

// 暴露方法给父组件
defineExpose({
  getSelectedPaths,
  setSelectedPaths,
  expandAll,
  collapseAll,
  refresh: refreshTree
})

onMounted(() => {
  buildTree()
})
</script>

<style lang="scss" scoped>
.email-tree-filter {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-lighter);

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.tree-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.tree-content {
  flex: 1;
  overflow: auto;
  position: relative;

  .el-tree {
    padding: 8px;

    :deep(.el-tree-node__content) {
      height: 32px;
      padding-right: 8px;

      &:hover {
        .node-actions {
          opacity: 1;
        }
      }
    }

    :deep(.el-tree-node__label) {
      flex: 1;
    }
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .node-content {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;

    .node-icon {
      flex-shrink: 0;
      color: var(--el-color-primary);
    }

    .node-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .node-count {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      background-color: var(--el-fill-color-light);
      padding: 2px 6px;
      border-radius: 10px;
    }
  }

  .node-actions {
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    gap: 4px;
  }
}

.tree-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);

  .el-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
}

.tree-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.tree-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-lighter);

  .selected-info {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .footer-actions {
    display: flex;
    gap: 8px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .tree-header {
    .header-title {
      font-size: 14px;
    }

    .header-actions {
      .el-button {
        padding: 4px;
      }
    }
  }

  .tree-node {
    .node-content {
      .node-label {
        font-size: 14px;
      }

      .node-count {
        font-size: 11px;
        padding: 1px 4px;
      }
    }
  }
}
</style>

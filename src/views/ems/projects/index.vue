<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectDto
} from "@/api/ems/projects";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "EmsProjects"
});

const loading = ref(false);
const items = ref<ProjectDto[]>([]);
const error = ref("");

const dialogVisible = ref(false);
const isEdit = ref(false);
const currentId = ref("");
const form = ref({
  name: "",
  timezone: "Asia/Shanghai"
});

const fetchList = async () => {
  error.value = "";
  loading.value = true;
  try {
    const res = await listProjects();
    if (!res.success) {
      error.value = res.error?.message ?? "加载失败";
      return;
    }
    items.value = res.data ?? [];
  } catch (err) {
    error.value = "请求失败";
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  isEdit.value = false;
  currentId.value = "";
  form.value = { name: "", timezone: "Asia/Shanghai" };
  dialogVisible.value = true;
};

const handleEdit = (row: ProjectDto) => {
  isEdit.value = true;
  currentId.value = row.projectId;
  form.value = {
    name: row.name,
    timezone: row.timezone || "Asia/Shanghai"
  };
  dialogVisible.value = true;
};

const handleDelete = (row: ProjectDto) => {
  ElMessageBox.confirm(`确认删除项目 "${row.name}" 吗？此操作不可撤销。`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    loading.value = true;
    try {
      const res = await deleteProject(row.projectId);
      if (res.success) {
        ElMessage.success("删除成功");
        await fetchList();
      } else {
        ElMessage.error(res.error?.message ?? "删除失败");
      }
    } catch {
      ElMessage.error("请求失败");
    } finally {
      loading.value = false;
    }
  });
};

const submit = async () => {
  const name = form.value.name.trim();
  if (!name) {
    ElMessage.warning("请输入项目名称");
    return;
  }
  loading.value = true;
  try {
    const timezone = form.value.timezone.trim();
    let res;
    if (isEdit.value) {
      res = await updateProject(currentId.value, {
        name,
        timezone: timezone ? timezone : undefined
      });
    } else {
      res = await createProject({
        name,
        timezone: timezone ? timezone : undefined
      });
    }

    if (!res.success) {
      ElMessage.error(res.error?.message ?? (isEdit.value ? "更新失败" : "创建失败"));
      return;
    }
    ElMessage.success(isEdit.value ? "更新成功" : "创建成功");
    dialogVisible.value = false;
    await fetchList();
  } catch (err) {
    ElMessage.error("请求失败");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="projects-container animate-fade-in-up">
    <div class="projects-header flex justify-between items-end">
      <div>
        <h1>项目管理</h1>
        <p class="subtitle">管理您的能源监控项目资源</p>
      </div>
      <div class="flex gap-2">
        <el-button
          :icon="useRenderIcon('ep:refresh')"
          :loading="loading"
          @click="fetchList"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:add-circle-line')"
          @click="handleAdd"
        >
          添加项目
        </el-button>
      </div>
    </div>

    <el-card class="projects-card mb-6" shadow="never">
      <div v-if="error" class="error-banner">
        <el-alert type="error" :closable="false" show-icon>
          {{ error }}
        </el-alert>
      </div>

      <el-table
        v-loading="loading"
        class="projects-table"
        :data="items"
        empty-text="暂无项目数据"
        row-class-name="animate-fade-in-up"
      >
        <el-table-column
          prop="name"
          label="项目名称"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="projectId"
          label="项目 ID"
          min-width="200"
        >
          <template #default="{ row }">
            <code class="text-xs opacity-70">{{ row.projectId }}</code>
          </template>
        </el-table-column>
        <el-table-column
          prop="timezone"
          label="时区"
          width="150"
          :formatter="(row: any) => row.timezone || 'UTC'"
        />
        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default>
            <el-tag type="success" size="small" effect="light" class="rounded-full">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="useRenderIcon('ep:edit-pen')"
              @click="handleEdit(row)"
            />
            <el-button
              link
              type="danger"
              :icon="useRenderIcon('ep:delete')"
              @click="handleDelete(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '添加项目'"
      width="500px"
      append-to-body
      destroy-on-close
      class="premium-dialog"
    >
      <el-form :model="form" label-position="top" class="mt-2">
        <el-form-item label="项目名称" required>
          <el-input
            v-model="form.name"
            placeholder="输入项目名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="时区">
          <el-select
            v-model="form.timezone"
            placeholder="选择时区"
            style="width: 100%"
          >
            <el-option label="UTC" value="UTC" />
            <el-option label="UTC+8 (北京)" value="Asia/Shanghai" />
            <el-option label="UTC-5 (纽约)" value="America/New_York" />
            <el-option label="UTC+0 (伦敦)" value="Europe/London" />
            <el-option label="UTC+9 (东京)" value="Asia/Tokyo" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="submit">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.projects-container {
  padding: var(--space-6);
  max-width: 1600px;
  margin: 0 auto;
}

.projects-header {
  margin-bottom: var(--space-8);
}

.projects-header h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-cream-900);
  margin-bottom: var(--space-2);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-cream-600);
  margin: 0;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-6);
}
.projects-card {
  contain: layout style; /* Optimize burden: Containment */

  border-radius: var(--radius-xl);
  border: 1px solid var(--color-cream-200);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.card-header h3 {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-cream-900);
  margin: 0;
}

.error-banner {
  margin-bottom: var(--space-4);
}

.projects-table {
  width: 100%;

  :deep(.el-table__header-wrapper) {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  :deep(.el-table__body-wrapper) {
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
}

.project-form {
  padding: var(--space-4) 0;
}

/* Dark mode */
:deep(.dark) .projects-header h1 {
  color: #fff;
}

:deep(.dark) .subtitle {
  color: var(--color-cream-600);
}

:deep(.dark) .projects-card {
  background: rgba(26, 26, 26, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.dark) .card-header h3 {
  color: #fff;
}

/* Responsive */
@media (max-width: 768px) {
  .projects-container {
    padding: var(--space-4);
  }

  .projects-header h1 {
    font-size: 1.5rem;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>

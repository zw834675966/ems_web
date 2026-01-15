<script setup lang="ts">
import { ref } from "vue";
import {
  listProjects,
  createProject,
  type ProjectDto
} from "@/api/ems/projects";

defineOptions({
  name: "EmsProjects"
});

const loading = ref(false);
const items = ref<ProjectDto[]>([]);
const error = ref("");
const form = ref({
  name: "",
  timezone: "UTC"
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

const submit = async () => {
  error.value = "";
  const name = form.value.name.trim();
  if (!name) {
    error.value = "请输入项目名称";
    return;
  }
  loading.value = true;
  try {
    const timezone = form.value.timezone.trim();
    const res = await createProject({
      name,
      timezone: timezone ? timezone : undefined
    });
    if (!res.success) {
      error.value = res.error?.message ?? "创建失败";
      return;
    }
    form.value.name = "";
    await fetchList();
  } catch (err) {
    error.value = "请求失败";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div>项目列表</div>
      </template>
      <div class="flex items-center gap-2">
        <el-button type="primary" :loading="loading" @click="fetchList">
          加载列表
        </el-button>
        <span v-if="error" class="text-red-500">{{ error }}</span>
      </div>
      <el-table class="mt-4" :data="items" border>
        <el-table-column prop="projectId" label="projectId" min-width="220" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="timezone" label="时区" min-width="120" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div>创建项目</div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="项目名称" />
        </el-form-item>
        <el-form-item label="时区">
          <el-input v-model="form.timezone" placeholder="UTC" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">
            创建
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

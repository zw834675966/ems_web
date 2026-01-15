<script setup lang="ts">
import { ref } from "vue";
import {
  listGateways,
  createGateway,
  type GatewayDto
} from "@/api/ems/gateways";

defineOptions({
  name: "EmsGateways"
});

const loading = ref(false);
const items = ref<GatewayDto[]>([]);
const error = ref("");
const projectId = ref("");
const form = ref({
  name: "",
  status: "offline"
});

const fetchList = async () => {
  error.value = "";
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请输入 projectId";
    return;
  }
  loading.value = true;
  try {
    const res = await listGateways(pid);
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
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请输入 projectId";
    return;
  }
  const name = form.value.name.trim();
  if (!name) {
    error.value = "请输入网关名称";
    return;
  }
  loading.value = true;
  try {
    const status = form.value.status.trim();
    const res = await createGateway(pid, {
      name,
      status: status ? status : undefined
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
        <div>网关列表</div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="projectId">
          <el-input v-model="projectId" placeholder="项目 ID" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchList">
            加载列表
          </el-button>
          <span v-if="error" class="ml-2 text-red-500">{{ error }}</span>
        </el-form-item>
      </el-form>
      <el-table class="mt-4" :data="items" border>
        <el-table-column prop="gatewayId" label="gatewayId" min-width="220" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="status" label="状态" min-width="120" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div>创建网关</div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="projectId">
          <el-input v-model="projectId" placeholder="项目 ID" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="网关名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input v-model="form.status" placeholder="online/offline" />
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

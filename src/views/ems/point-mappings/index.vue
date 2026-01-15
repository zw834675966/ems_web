<script setup lang="ts">
import { ref } from "vue";
import {
  listPointMappings,
  createPointMapping,
  type PointMappingDto
} from "@/api/ems/pointMappings";

defineOptions({
  name: "EmsPointMappings"
});

const loading = ref(false);
const items = ref<PointMappingDto[]>([]);
const error = ref("");
const projectId = ref("");
const form = ref({
  pointId: "",
  sourceType: "mqtt",
  address: "",
  scale: null as number | null,
  offset: null as number | null
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
    const res = await listPointMappings(pid);
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
  const pointId = form.value.pointId.trim();
  if (!pointId) {
    error.value = "请输入 pointId";
    return;
  }
  const sourceType = form.value.sourceType.trim();
  if (!sourceType) {
    error.value = "请输入 sourceType";
    return;
  }
  const address = form.value.address.trim();
  if (!address) {
    error.value = "请输入 address";
    return;
  }
  loading.value = true;
  try {
    const payload: {
      pointId: string;
      sourceType: string;
      address: string;
      scale?: number;
      offset?: number;
    } = {
      pointId,
      sourceType,
      address
    };
    if (form.value.scale !== null) {
      payload.scale = form.value.scale;
    }
    if (form.value.offset !== null) {
      payload.offset = form.value.offset;
    }
    const res = await createPointMapping(pid, payload);
    if (!res.success) {
      error.value = res.error?.message ?? "创建失败";
      return;
    }
    form.value.address = "";
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
        <div>点位映射列表</div>
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
        <el-table-column prop="sourceId" label="sourceId" min-width="220" />
        <el-table-column prop="pointId" label="pointId" min-width="220" />
        <el-table-column prop="sourceType" label="sourceType" min-width="120" />
        <el-table-column prop="address" label="address" min-width="200" />
        <el-table-column prop="scale" label="scale" min-width="100" />
        <el-table-column prop="offset" label="offset" min-width="100" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div>创建点位映射</div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="projectId">
          <el-input v-model="projectId" placeholder="项目 ID" />
        </el-form-item>
        <el-form-item label="pointId">
          <el-input v-model="form.pointId" placeholder="点位 ID" />
        </el-form-item>
        <el-form-item label="sourceType">
          <el-input v-model="form.sourceType" placeholder="mqtt" />
        </el-form-item>
        <el-form-item label="address">
          <el-input v-model="form.address" placeholder="topic/xxx" />
        </el-form-item>
        <el-form-item label="scale">
          <el-input-number v-model="form.scale" :step="0.1" />
        </el-form-item>
        <el-form-item label="offset">
          <el-input-number v-model="form.offset" :step="0.1" />
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

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { getRealtime, type RealtimeValueDto } from "@/api/ems/realtime";
import { listPoints, type PointDto } from "@/api/ems/points";
import EmsProjectSelector from "@/components/EmsProjectSelector/index.vue";
import dayjs from "dayjs";

defineOptions({
  name: "EmsRealtime"
});

const loading = ref(false);
const error = ref("");
const projectId = ref("");
const pointId = ref("");
const value = ref<RealtimeValueDto | null>(null);
const points = ref<PointDto[]>([]);
const autoRefresh = ref(false);
let refreshTimer: any = null;

const pointOptions = computed(() =>
  points.value.map(item => ({
    label: `${item.key} (${item.pointId})`,
    value: item.pointId,
    unit: item.unit
  }))
);

const currentPoint = computed(() =>
  points.value.find(p => p.pointId === pointId.value)
);

const refreshPoints = async () => {
  const pid = projectId.value.trim();
  points.value = [];
  if (!pid) return;
  try {
    const res = await listPoints(pid);
    if (!res.success) return;
    points.value = res.data ?? [];
  } catch {}
};

const fetchValue = async (quiet = false) => {
  if (!quiet) error.value = "";
  const pid = projectId.value.trim();
  const id = pointId.value.trim();
  if (!pid || !id) return;

  if (!quiet) loading.value = true;
	try {
	  const res = await getRealtime(pid, id);
	  if (!res.success) {
	    if (!quiet) error.value = res.error?.message ?? "查询失败";
	    return;
	  }
	  const items = res.data ?? [];
	  value.value = items[0] ?? null;
	} catch (err) {
	  if (!quiet) error.value = "请求失败";
	} finally {
	  if (!quiet) loading.value = false;
	}
};

const toggleAutoRefresh = (val: boolean) => {
  if (val) {
    refreshTimer = setInterval(() => {
      fetchValue(true);
    }, 5000);
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }
};

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

watch(
  () => projectId.value,
  async () => {
    pointId.value = "";
    value.value = null;
    autoRefresh.value = false;
    toggleAutoRefresh(false);
    await refreshPoints();
  }
);

watch(
  () => pointId.value,
  () => {
    value.value = null;
    if (pointId.value) fetchValue();
  }
);
</script>

<template>
  <div class="ems-page animate-fade-in-up">
    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-base font-medium">实时监控</div>
            <div class="text-xs text-gray-400">查看设备点位的秒级实时数据</div>
          </div>
          <EmsProjectSelector v-model="projectId" />
        </div>
      </template>

      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-[300px]">
          <label class="text-xs text-gray-400 block mb-1">监控点位</label>
          <el-select
            v-model="pointId"
            class="w-full"
            filterable
            placeholder="选择点位"
            :loading="loading"
          >
            <el-option
              v-for="opt in pointOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="flex items-end gap-2">
          <el-button type="primary" :loading="loading" @click="fetchValue(false)">
            手动采样
          </el-button>
          <div class="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
            <span class="text-xs text-gray-500">自动刷新 (5s)</span>
            <el-switch v-model="autoRefresh" size="small" @change="toggleAutoRefresh" />
          </div>
        </div>
      </div>
      <div v-if="error" class="mt-4">
        <el-alert type="error" :closable="false" show-icon>{{ error }}</el-alert>
      </div>
    </el-card>

    <div v-if="value" class="realtime-result grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Main Value Card -->
      <el-card class="md:col-span-2 value-card animate-fade-in-up" shadow="never">
        <div class="flex flex-col h-full justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                Live Data
              </span>
              <div v-if="autoRefresh" class="flex items-center gap-1">
                <span class="recording-dot" />
                <span class="text-[10px] text-gray-400 uppercase">Polling</span>
              </div>
            </div>
            <h2 class="text-lg font-medium text-gray-500 dark:text-gray-400">
              {{ currentPoint?.key || '-' }}
            </h2>
          </div>

          <div class="my-8 flex items-baseline gap-2">
            <span class="value-text text-7xl font-bold tracking-tighter">
              {{ value.value }}
            </span>
            <span class="unit-text text-2xl font-medium text-gray-400">
              {{ currentPoint?.unit || '' }}
            </span>
          </div>

          <div class="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4 mt-auto">
            <div class="flex flex-col">
              <span class="text-[10px] uppercase text-gray-400">Data Quality</span>
              <el-tag :type="value.quality === 'good' || !value.quality ? 'success' : 'warning'" size="small" effect="plain" class="mt-1">
                {{ value.quality || 'Good' }}
              </el-tag>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase text-gray-400">Last Updated</span>
              <div class="text-xs font-mono mt-1 text-gray-600 dark:text-gray-300">
                {{ dayjs(value.tsMs).format('YYYY-MM-DD HH:mm:ss.SSS') }}
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Meta Info Side Cards -->
      <div class="flex flex-col gap-4">
        <el-card class="meta-card" shadow="never">
          <template #header><span class="text-xs font-bold text-gray-400 uppercase">Context</span></template>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between">
              <span class="text-xs text-gray-400">Point ID</span>
              <code class="text-xs">{{ value.pointId }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-xs text-gray-400">Project ID</span>
              <code class="text-xs">{{ value.projectId }}</code>
            </div>
          </div>
        </el-card>

         <el-card class="meta-card" shadow="never">
          <template #header><span class="text-xs font-bold text-gray-400 uppercase">Device</span></template>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between">
              <span class="text-xs text-gray-400">Device ID</span>
              <code class="text-xs">{{ currentPoint?.deviceId }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-xs text-gray-400">Data Type</span>
              <span class="text-xs uppercase font-bold">{{ currentPoint?.dataType }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <div v-else-if="!loading" class="mt-20 flex flex-col items-center opacity-30">
       <el-empty description="请选择点位开始监控" />
    </div>
  </div>
</template>

<style scoped>
.ems-page {
  padding: var(--space-6);
  max-width: 1600px;
  margin: 0 auto;
}

.value-card {
  border-radius: 20px;
  background: var(--color-white);
  border: 1px solid var(--color-cream-100);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px -12px rgba(0, 0, 0, 0.08);
  }
}

.meta-card {
  border-radius: 12px;
  background: var(--color-gray-50);
  border: none;

  :deep(.el-card__header) {
    padding: 12px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  }
}

.value-text {
  font-family: var(--font-display);
  background: linear-gradient(135deg, #1d1d1f 0%, #d4a853 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.recording-dot {
  width: 6px;
  height: 6px;
  background-color: #f5222d;
  border-radius: 50%;
  box-shadow: 0 0 4px #f5222d;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

:deep(.dark) {
  .value-card {
    background: #1c1c1e;
    border-color: #2c2c2e;
  }
  .meta-card {
    background: #2c2c2e;
  }
  .value-text {
    background: linear-gradient(135deg, #fff 0%, #d4a853 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}
</style>

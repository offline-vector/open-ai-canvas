import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { listGenerationTasks, type GenerationTask } from "@/services/api/task-center";
import { syncGenerationTaskToCanvasStore } from "@/lib/canvas/canvas-generation-task-sync";

export function useCanvasActiveTasks(projectId: string, enabled: boolean) {
    const query = useQuery<GenerationTask[]>({
        queryKey: ["canvas-active-tasks", projectId],
        queryFn: () => listGenerationTasks(20, { projectId, activeOnly: false }),
        enabled: enabled && Boolean(projectId),
        refetchInterval: (current) => (current.state.data?.some((task) => task.status === "queued" || task.status === "running") ? 2_000 : 10_000),
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        const completed = (query.data || []).filter((task) => task.status === "succeeded" && task.type.startsWith("canvas_"));
        if (!completed.length) return;
        void Promise.all(completed.map((task) => syncGenerationTaskToCanvasStore(task)));
    }, [query.data]);

    useEffect(() => {
        const handleTaskCreated = (event: Event) => {
            const task = (event as CustomEvent<{ task?: GenerationTask }>).detail?.task;
            if (task?.projectId === projectId) void query.refetch();
        };
        window.addEventListener("canvas:task-created", handleTaskCreated);
        return () => window.removeEventListener("canvas:task-created", handleTaskCreated);
    }, [projectId, query.refetch]);

    return {
        tasks: (query.data || []).filter((task) => task.status === "queued" || task.status === "running"),
        loading: query.isLoading,
        refreshing: query.isFetching,
        refetch: query.refetch,
    };
}

import { createBrowserRouter, Navigate, Outlet } from "react-router";

import { RequireFeature } from "@/components/auth/require-feature";
import UserLayout from "@/layouts/user-layout";
import AssetsPage from "@/pages/assets";
import CanvasPage from "@/pages/canvas";
import CanvasProjectPage from "@/pages/canvas/project";
import CreatePage from "@/pages/create";
import HomePage from "@/pages/home";
import NotFound from "@/pages/not-found";
import RouteErrorPage from "@/pages/route-error";
import SkillsPage from "@/pages/skills";
import TasksPage from "@/pages/tasks";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/projects/detail";
import SettingsPage from "@/pages/settings";
import TestVoiceRecording from "@/pages/test-voice-recording";

export const router = createBrowserRouter([
    {
        element: (
            <UserLayout>
                <Outlet />
            </UserLayout>
        ),
        errorElement: <RouteErrorPage />,
        children: [
            { path: "/", element: <Navigate to="/create" replace /> },
            { path: "/create", element: <CreatePage /> },
            { path: "/home", element: <HomePage /> },
            { path: "/tasks", element: <RequireFeature feature="taskCenterEnabled"><TasksPage /></RequireFeature> },
            { path: "/assets", element: <AssetsPage /> },
            { path: "/skills", element: <SkillsPage /> },
            { path: "/settings", element: <SettingsPage /> },
            { path: "/test-voice-recording", element: <TestVoiceRecording /> },
            { path: "/projects", element: <RequireFeature feature="shortDramaEnabled"><ProjectsPage /></RequireFeature> },
            { path: "/projects/:projectId", element: <RequireFeature feature="shortDramaEnabled"><ProjectDetailPage /></RequireFeature> },
            { path: "/projects/:projectId/:view", element: <RequireFeature feature="shortDramaEnabled"><ProjectDetailPage /></RequireFeature> },
            { path: "/projects/:projectId/chapters/:chapterId", element: <RequireFeature feature="shortDramaEnabled"><ProjectDetailPage /></RequireFeature> },
            { path: "/canvas", element: <CanvasPage /> },
            { path: "/canvas/:id", element: <CanvasProjectPage /> },
        ],
    },
    { path: "*", element: <NotFound /> },
]);

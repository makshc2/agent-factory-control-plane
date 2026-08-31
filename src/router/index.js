import { createRouter, createWebHistory } from 'vue-router'
import BoardView from '@/views/BoardView.vue'
import AnalysisView from '@/views/AnalysisView.vue'
import AnalysisDetailsView from '@/views/AnalysisDetailsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'board',
      component: BoardView,
    },
    {
      path: '/analysis',
      redirect: '/',
    },
    {
      path: '/analysis/:projectId',
      name: 'analysis',
      component: AnalysisView,
    },
    {
      path: '/analysis/:projectId/metrics/:changeRef',
      name: 'analysis-details',
      component: AnalysisDetailsView,
    },
  ],
})

export default router

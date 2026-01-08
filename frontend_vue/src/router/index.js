import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/login.vue')
    },{
      path: '/register',
      name: 'register',
      component: () => import('@/components/register.vue')
    },{
    path: '/calendario',
    name: '/calendario',
      component: () => import('@/components/calendario.vue')
    },{
      path: '/crearEvento',
      name: 'crearEvento',
      component: () => import('@/components/crearEvento.vue')
    },{
      path: '/gestionarEventos',
      name: 'gestionarEventos',
      component: () => import('@/components/gestionarEventos.vue')
    },{
      path: '/editarEvento/:id',
      name: 'editarEvento',
      component: () => import('@/components/editarEvento.vue'),
      props: true
    }
  ]
});

export default router;
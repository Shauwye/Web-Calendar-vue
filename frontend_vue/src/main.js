import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';


import Aura from '@primevue/themes/aura';
import 'primevue/resources/themes/aura-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.use(ToastService);

app.component('Toast', Toast);

app.mount('#app');

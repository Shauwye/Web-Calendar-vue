
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    const username = ref('')
    const jwtToken = ref('')

    const setUsername = (newUsername) => {
        username.value = newUsername
    }

    const setToken = (token) => {
        jwtToken.value = token
    }

    const clearAuth = () => {
        username.value = ''
        jwtToken.value = ''
    }

    const isAuthenticated = () => {
        return !!jwtToken.value
    }

    return {
        username,
        jwtToken,
        setUsername,
        setToken,
        clearAuth,
        isAuthenticated
    }
})
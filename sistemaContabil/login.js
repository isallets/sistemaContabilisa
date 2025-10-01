// frontend/login.js

// Importa o 'auth' do nosso arquivo de configuração
import { auth } from './firebase-config.js';
// Importa as funções de login do Firebase
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const btnLoginGoogle = document.getElementById('login-google');

// Checa se o usuário JÁ ESTÁ LOGADO
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Se já está logado, redireciona para a página principal
        console.log("Usuário já logado, redirecionando...", user.displayName);
        window.location.href = 'index.html';
    }
});

// Evento de clique para o botão de login
btnLoginGoogle.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
        .then((result) => {
            // Login bem-sucedido
            const user = result.user;
            console.log("Login com Google bem-sucedido!", user);
            // Redireciona para a página principal
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // Lida com erros
            console.error("Erro no login com Google:", error);
        });
});
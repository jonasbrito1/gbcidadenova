# 🔐 Como Configurar Google OAuth - Passo a Passo

## ❗ IMPORTANTE
O erro "URL não encontrado" ocorre porque as credenciais Google ainda não foram configuradas com valores reais.

---

## 📋 Passo a Passo para Configurar

### **1. Acessar Google Cloud Console**
```
🔗 https://console.cloud.google.com
```

### **2. Criar Novo Projeto**
1. Clique em **"Select a project"** (topo da página)
2. Clique em **"NEW PROJECT"**
3. Nome do projeto: **`Gracie Barra Sistema`**
4. Clique em **"CREATE"**
5. Aguarde a criação e selecione o projeto

### **3. Ativar APIs Necessárias**
1. No menu lateral, vá em: **APIs & Services → Library**
2. Procure por: **`Google+ API`**
3. Clique em **"ENABLE"**
4. Volte e procure: **`People API`**
5. Clique em **"ENABLE"**

### **4. Configurar Tela de Consentimento OAuth**
1. Vá em: **APIs & Services → OAuth consent screen**
2. Escolha: **External** (para aceitar qualquer conta Google)
3. Clique **"CREATE"**
4. Preencha:
   - **App name:** `Gracie Barra Sistema`
   - **User support email:** seu-email@gmail.com
   - **Developer contact:** seu-email@gmail.com
5. Clique **"SAVE AND CONTINUE"**
6. Em **Scopes**, clique **"ADD OR REMOVE SCOPES"**
7. Adicione:
   - ✅ `.../auth/userinfo.email`
   - ✅ `.../auth/userinfo.profile`
8. Clique **"UPDATE"** e depois **"SAVE AND CONTINUE"**
9. Em **Test users**, adicione seu email para teste
10. Clique **"SAVE AND CONTINUE"**

### **5. Criar Credenciais OAuth 2.0**
1. Vá em: **APIs & Services → Credentials**
2. Clique em **"CREATE CREDENTIALS"**
3. Escolha: **"OAuth 2.0 Client ID"**
4. Application type: **"Web application"**
5. Nome: **`Gracie Barra Web Client`**
6. Em **"Authorized JavaScript origins"**, adicione:
   ```
   http://localhost:3010
   http://localhost:3011
   ```
7. Em **"Authorized redirect URIs"**, adicione:
   ```
   http://localhost:3011/api/auth/google/callback
   ```
8. Clique **"CREATE"**
9. **COPIE as credenciais:**
   - **Client ID**: `algo.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxx`

### **6. Configurar no Sistema**

#### **Backend (.env)**
Edite o arquivo: `c:\Users\Home\Desktop\Projects\graciebarra_sistemaV2\server\.env`

Ou execute no Docker:
```bash
docker exec gb_backend_modern sh -c "sed -i 's/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI/' .env"

docker exec gb_backend_modern sh -c "sed -i 's/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=SEU_SECRET_AQUI/' .env"

docker restart gb_backend_modern
```

Adicione/substitua:
```env
GOOGLE_CLIENT_ID=seu_client_id_real.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-seu_secret_real
GOOGLE_CALLBACK_URL=http://localhost:3011/api/auth/google/callback
```

#### **Frontend (.env)**
Crie/edite: `c:\Users\Home\Desktop\Projects\graciebarra_sistemaV2\client\.env`

Adicione:
```env
REACT_APP_GOOGLE_CLIENT_ID=seu_client_id_real.apps.googleusercontent.com
```

### **7. Reiniciar Serviços**
```bash
# Reiniciar backend
docker restart gb_backend_modern

# Reiniciar frontend (Ctrl+C e depois)
cd c:/Users/Home/Desktop/Projects/graciebarra_sistemaV2/client
set PORT=3010 && npm start
```

---

## ✅ Testar Login Google

1. Acesse: **http://localhost:3010/login**
2. Clique em **"Sign in with Google"**
3. Escolha sua conta Google
4. Autorize o acesso
5. **Resultado:** Você será redirecionado para o dashboard!

---

## 🔍 Troubleshooting

### **Erro: "redirect_uri_mismatch"**
- Verifique se a URL de callback está EXATAMENTE como configurou no Google:
  - `http://localhost:3011/api/auth/google/callback`

### **Erro: "invalid_client"**
- Verifique se o Client ID e Secret estão corretos
- Confirme que copiou do projeto correto no Google Cloud Console

### **Erro: "access_denied"**
- Verifique se adicionou seu email como "Test user" na tela de consentimento

### **Erro: "URL não encontrado" (404)**
- ✅ **JÁ CORRIGIDO!** O backend está rodando
- Mas você precisa adicionar as credenciais reais

---

## 📝 Valores Atuais (PLACEHOLDER - TROCAR!)

**Backend (.env):**
```env
GOOGLE_CLIENT_ID=362730662899-1b3rg8vldr8uvqb9s2rr9cqbsm5hmtfg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-temp_secret  ⚠️ TROCAR!
```

**Frontend (.env):**
```env
REACT_APP_GOOGLE_CLIENT_ID=362730662899-1b3rg8vldr8uvqb9s2rr9cqbsm5hmtfg.apps.googleusercontent.com
```

⚠️ **Esses valores são placeholders e NÃO FUNCIONAM!**
Você DEVE criar suas próprias credenciais.

---

## 🎥 Vídeo Tutorial (Opcional)

Se preferir assistir um tutorial em vídeo:
🔗 https://www.youtube.com/results?search_query=google+oauth+credentials+setup

---

## ✨ Após Configurar

Quando configurar corretamente, o login Google funcionará assim:

1. ✅ Clica em "Sign in with Google"
2. ✅ Popup do Google aparece
3. ✅ Seleciona conta
4. ✅ Autoriza acesso
5. ✅ Sistema cria/vincula usuário automaticamente
6. ✅ Redireciona para dashboard
7. ✅ Foto do perfil Google é salva
8. ✅ Próximos logins são instantâneos!

---

**Tempo estimado de configuração:** 10-15 minutos

**Dúvidas?** Consulte: `INTEGRACOES.md` para documentação completa

# Segurança da API

## Proteções Implementadas

### 1. **XSS (Cross-Site Scripting)**
- ✅ **Escape HTML**: Todos os inputs escapam caracteres `<`, `>`, `&`, `"`, `'`, `;`, `\`
- ✅ **Preserve Encoding**: Acentos e caracteres válidos são preservados
- Exemplo: `<script>alert('xss')</script>` → `&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;`

### 2. **SQL Injection**
- ✅ **Prepared Statements**: Drizzle ORM usa query parametrização
- Exemplo seguro:
  ```typescript
  db.select().from(clients).where(eq(clients.name, userInput))
  // Não concatena strings diretamente na query
  ```
- ❌ Unsafe (NÃO FAZER):
  ```typescript
  db.query(`SELECT * FROM clients WHERE name = '${userInput}'`)
  ```

### 3. **Input Validation**
- ✅ **class-validator**: Valida tipos, tamanhos, formatos
- ✅ **Whitelist**: Remove campos desconhecidos (`forbidNonWhitelisted: true`)
- ✅ **Rate Limiting**: 100 requisições/minuto por IP

### 4. **Autenticação**
- ✅ **JWT**: Token seguro com expiração
- ✅ **Guards**: Rotas protegidas com `@UseGuards(JwtAuthGuard)`
- ✅ **Bcrypt**: Senhas com hash seguro

## Camadas de Proteção

```
1. Client → Validação (DTOs com class-validator)
            ↓
2. Sanitização (escape HTML)
            ↓
3. Rate Limiting (@nestjs/throttler)
            ↓
4. Autenticação (JWT)
            ↓
5. Banco de Dados (Drizzle prepared statements)
```

## Recomendações Adicionais

- [ ] CORS configurado em produção
- [ ] HTTPS obrigatório
- [ ] Helmet.js para headers de segurança
- [ ] Logs de auditoria para operações sensíveis
- [ ] Verificação de permissões por recurso (RBAC)

## Referência

- [XSS Prevention](https://owasp.org/www-community/attacks/xss/)
- [SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Drizzle Security](https://orm.drizzle.team/)

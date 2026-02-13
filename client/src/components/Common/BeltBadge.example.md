# 🥋 BeltBadge Component - Guia de Uso

Componente de faixa de Jiu-Jitsu realista para uso em todo o sistema.

## 📦 Importação

```javascript
import BeltBadge from '../../components/Common/BeltBadge';
```

## 🎯 Uso Básico

### Exemplo 1: Faixa simples

```jsx
<BeltBadge graduacao="Azul" />
```

### Exemplo 2: Faixa com graus

```jsx
<BeltBadge graduacao="Azul" graus={3} />
```

### Exemplo 3: Faixa sem label

```jsx
<BeltBadge graduacao="Preta" graus={2} showLabel={false} />
```

### Exemplo 4: Tamanhos diferentes

```jsx
<BeltBadge graduacao="Roxa" size="small" />
<BeltBadge graduacao="Roxa" size="medium" />
<BeltBadge graduacao="Roxa" size="large" />
```

## 🎨 Graduações Disponíveis

### Kids/Infantil
- `"Branca Kids"`
- `"Cinza Kids"`
- `"Amarela Kids"`
- `"Laranja Kids"`
- `"Verde Kids"`
- `"Coral Kids"`

### Adultos
- `"Branca"`
- `"Azul"`
- `"Roxa"`
- `"Marrom"`
- `"Preta"`

### Master
- `"Preta Master"`
- `"Coral Master"`
- `"Vermelha Master"`

### Dans (Graus de Faixa Preta)
- `"1º Dan"` até `"10º Dan"`

## 📏 Propriedades

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `graduacao` | string | `"Branca"` | Nome da graduação |
| `graus` | number | `0` | Número de graus (0-4) |
| `size` | string | `"medium"` | Tamanho: `"small"`, `"medium"`, `"large"` |
| `showLabel` | boolean | `true` | Mostrar ou ocultar o label |

## 💡 Exemplos de Uso no Sistema

### 1. Lista de Alunos

```jsx
// students.js
<Table>
  <tbody>
    {students.map((student) => (
      <tr key={student.id}>
        <td>{student.nome}</td>
        <td>
          <BeltBadge
            graduacao={student.graduacao}
            graus={student.graus_faixa}
            size="small"
          />
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

### 2. Perfil do Aluno

```jsx
// StudentProfile.js
<div className="student-profile">
  <div className="profile-header">
    <h2>{student.nome}</h2>
    <BeltBadge
      graduacao={student.graduacao}
      graus={student.graus_faixa}
      size="large"
    />
  </div>
</div>
```

### 3. Card/Badge Compacto

```jsx
// StudentCard.js
<Card>
  <Card.Body>
    <div className="d-flex align-items-center gap-2">
      <BeltBadge
        graduacao={student.graduacao}
        graus={student.graus_faixa}
        size="small"
        showLabel={false}
      />
      <span>{student.nome}</span>
    </div>
  </Card.Body>
</Card>
```

### 4. Modal de Visualização

```jsx
// StudentViewModal.js
<Modal.Body>
  <div className="student-belt-section">
    <label>Graduação Atual:</label>
    <BeltBadge
      graduacao={student.graduacao}
      graus={student.graus_faixa}
      size="medium"
    />
  </div>
</Modal.Body>
```

### 5. Histórico de Graduações

```jsx
// StudentGraduationsModal.js
<Timeline>
  {graduacoes.map((grad) => (
    <Timeline.Item key={grad.id}>
      <BeltBadge
        graduacao={grad.graduacao}
        graus={grad.graus}
        size="small"
      />
      <span>{formatDate(grad.data_graduacao)}</span>
    </Timeline.Item>
  ))}
</Timeline>
```

### 6. Dashboard - Estatísticas

```jsx
// Dashboard.js
<div className="stats-by-belt">
  <h4>Alunos por Graduação</h4>
  {stats.map((stat) => (
    <div key={stat.graduacao} className="stat-row">
      <BeltBadge
        graduacao={stat.graduacao}
        size="small"
        showLabel={false}
      />
      <span className="belt-name">{stat.graduacao}</span>
      <Badge bg="primary">{stat.count}</Badge>
    </div>
  ))}
</div>
```

### 7. Formulário de Graduação

```jsx
// GraduationForm.js
<Form.Group>
  <Form.Label>Nova Graduação</Form.Label>
  <Form.Select
    value={selectedGraduacao}
    onChange={(e) => setSelectedGraduacao(e.target.value)}
  >
    <option value="">Selecione...</option>
    <option value="Branca">Branca</option>
    <option value="Azul">Azul</option>
    {/* ... */}
  </Form.Select>

  {/* Preview */}
  {selectedGraduacao && (
    <div className="mt-2">
      <label>Preview:</label>
      <BeltBadge
        graduacao={selectedGraduacao}
        graus={selectedGraus}
        size="medium"
      />
    </div>
  )}
</Form.Group>
```

### 8. Turmas - Lista de Alunos

```jsx
// TurmaAlunosList.js
<div className="turma-alunos">
  {alunos.map((aluno) => (
    <div key={aluno.id} className="aluno-item">
      <BeltBadge
        graduacao={aluno.graduacao}
        graus={aluno.graus_faixa}
        size="small"
        showLabel={false}
      />
      <span>{aluno.nome}</span>
    </div>
  ))}
</div>
```

## 🎨 Customização CSS

Se você precisar customizar ainda mais, pode sobrescrever as variáveis CSS:

```css
.belt-badge-custom {
  --belt-width: 100px;
  --belt-height: 35px;
  --knot-size: 28px;
  --degree-size: 3.5px;
  --degree-height: 14px;
  --font-size: 13px;
}
```

## 📱 Responsividade

O componente já é responsivo e se adapta automaticamente a telas menores.

## ♿ Acessibilidade

Para melhorar a acessibilidade, considere adicionar `aria-label`:

```jsx
<div aria-label={`Faixa ${graduacao} com ${graus} graus`}>
  <BeltBadge graduacao={graduacao} graus={graus} />
</div>
```

## 🔍 Troubleshooting

### Problema: Faixa não aparece

**Solução:** Verifique se o CSS foi importado corretamente e se o nome da graduação está exato (case-sensitive).

### Problema: Graus não aparecem

**Solução:** Verifique se `graus` é um número entre 0 e 4.

### Problema: Cores erradas

**Solução:** Confira se o nome da graduação corresponde exatamente a um dos valores listados acima.

---

**Desenvolvido com ❤️ para Gracie Barra Cidade Nova**

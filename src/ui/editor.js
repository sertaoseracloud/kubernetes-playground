// Editor de código com abas de arquivos (manifest.yaml, service.yaml, base/deployment.yaml...),
// como no DivergeTerraform: as cores vêm do tema do site (tema-editor.js), o leitor de tela ouve o
// nome do editor e os atalhos (#ajuda-editor), Ctrl+Enter roda e Ctrl+Shift+Enter envia. O Tab
// não fica preso aqui dentro: ele sai do editor (recuar a linha é Ctrl+[).
//
// O apply usa todos os arquivos YAML juntos, separados por ---, como `kubectl apply -f .` numa
// pasta. Os outros (README.md, .txt) ficam só de anotação.
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { temaEditor } from './tema-editor.js';
import { anunciar } from './anuncios.js';

export const ARQUIVO_PRINCIPAL = 'manifest.yaml';
// Pastas são permitidas (base/deployment.yaml), sem subir de nível (..).
const NOME_VALIDO = /^([\w-]+\/){0,3}[\w.-]+\.(ya?ml|json|md|txt)$/;
const EH_MANIFESTO = /\.(ya?ml|json)$/;

/** Arquivos a partir do que foi salvo: um texto (rascunhos antigos, um arquivo só) vira manifest.yaml. */
export function normalizarArquivos(valor) {
  if (typeof valor === 'string') return { [ARQUIVO_PRINCIPAL]: valor };
  if (valor && typeof valor === 'object' && Object.values(valor).every((v) => typeof v === 'string') && Object.keys(valor).length) return { ...valor };
  return null;
}

/** O YAML que vai para o apply: os manifestos na ordem das abas, separados por ---. */
export function juntarArquivos(arquivos) {
  const manifestos = Object.entries(arquivos ?? {}).filter(([nome]) => EH_MANIFESTO.test(nome)).map(([, texto]) => texto);
  if (manifestos.length <= 1) return manifestos[0] ?? '';
  return manifestos.map((t) => t.replace(/\s+$/, '')).join('\n---\n').concat('\n');
}

/** Um arquivo só, com o nome padrão: o rascunho é guardado como texto, como sempre foi. */
export const formaDeGuardar = (arquivos) => {
  const nomes = Object.keys(arquivos);
  return nomes.length === 1 && nomes[0] === ARQUIVO_PRINCIPAL ? arquivos[ARQUIVO_PRINCIPAL] : { ...arquivos };
};

export class EditorArquivos {
  constructor({ abas, editor, aoMudar = () => {}, aoExecutar = () => {}, aoEnviar = () => {} }) {
    this.elAbas = abas;
    this.aoMudar = aoMudar;
    this.arquivos = {};
    this.atual = null;
    this.estados = new Map();
    this.extensoes = [
      basicSetup,
      temaEditor,
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
      Prec.highest(keymap.of([
        { key: 'Mod-Enter', run: () => { aoExecutar(); return true; } },
        { key: 'Mod-Shift-Enter', run: () => { aoEnviar(); return true; } },
      ])),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          this.arquivos[this.atual] = u.state.doc.toString();
          this.aoMudar(this.arquivos);
        }
      }),
    ];
    this.view = new EditorView({ parent: editor });
    // O Enter adiado pelo CodeMirror no Android perde os modificadores do teclado físico.
    this.view.contentDOM.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter' || evento.isComposing || evento.altKey
        || !(evento.ctrlKey || evento.metaKey)) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      if (evento.shiftKey) aoEnviar();
      else aoExecutar();
    }, { capture: true });
  }

  /** Primeiro arquivo (em geral, manifest.yaml). */
  get principal() {
    return Object.keys(this.arquivos)[0];
  }

  carregar(arquivos) {
    this.arquivos = { ...(normalizarArquivos(arquivos) ?? { [ARQUIVO_PRINCIPAL]: '' }) };
    this.estados.clear();
    this.atual = this.principal;
    this.view.setState(this.#estadoDe(this.atual));
    this.#renderAbas();
  }

  abrir(nome) {
    this.estados.set(this.atual, this.view.state);
    this.atual = nome;
    this.view.setState(this.estados.get(nome) ?? this.#estadoDe(nome));
    this.#renderAbas();
    this.view.focus();
  }

  /** O texto do apply (todos os manifestos juntos). */
  getValue() {
    return juntarArquivos(this.arquivos);
  }

  /** Troca o conteúdo: um texto vira manifest.yaml; um objeto, as abas. */
  setValue(valor) {
    this.carregar(valor);
  }

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }

  #estadoDe(nome) {
    const modo = /\.ya?ml$/.test(nome) ? 'YAML (Kubernetes)' : /\.md$/.test(nome) ? 'Markdown' : 'texto simples';
    return EditorState.create({ doc: this.arquivos[nome] ?? '', extensions: [
      ...this.extensoes,
      ...(/\.ya?ml$/.test(nome) ? [yaml()] : /\.md$/.test(nome) ? [markdown()] : []),
      EditorView.contentAttributes.of({
        tabindex: '0', 'aria-label': `Editor de ${nome} — ${modo}`, 'aria-describedby': 'ajuda-editor',
      }),
    ] });
  }

  #renderAbas() {
    this.elAbas.replaceChildren();
    for (const nome of Object.keys(this.arquivos)) {
      const grupo = document.createElement('span');
      grupo.className = 'aba-arquivo';
      const aba = document.createElement('button');
      aba.type = 'button';
      aba.className = 'aba' + (nome === this.atual ? ' ativa' : '');
      aba.textContent = nome;
      aba.title = nome;
      if (nome === this.atual) aba.setAttribute('aria-current', 'true');
      aba.onclick = () => this.abrir(nome);
      grupo.append(aba);
      if (nome !== this.principal) {
        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.className = 'btn-excluir-arquivo';
        excluir.textContent = '×';
        excluir.title = `Excluir ${nome}`;
        excluir.setAttribute('aria-label', `Excluir ${nome}`);
        excluir.onclick = () => this.#excluir(nome);
        grupo.append(excluir);
      }
      this.elAbas.append(grupo);
    }
    const novo = document.createElement('button');
    novo.type = 'button';
    novo.className = 'aba';
    novo.textContent = '+';
    novo.title = 'Novo arquivo';
    novo.setAttribute('aria-label', 'Novo arquivo');
    novo.onclick = () => this.#novo();
    this.elAbas.append(novo);
  }

  #excluir(nome) {
    if (!confirm(`Excluir o arquivo ${nome}?`)) return;
    delete this.arquivos[nome];
    this.estados.delete(nome);
    this.aoMudar(this.arquivos);
    if (this.atual === nome) {
      this.atual = this.principal;
      this.view.setState(this.estados.get(this.atual) ?? this.#estadoDe(this.atual));
    }
    this.#renderAbas();
    this.view.focus();
    anunciar(`Arquivo ${nome} excluído. Editor de ${this.atual} ativo.`);
  }

  #novo() {
    const nome = prompt('Nome do novo arquivo (ex.: service.yaml, configmap.yaml ou base/deployment.yaml):', 'service.yaml')?.trim();
    if (!nome) return;
    if (!NOME_VALIDO.test(nome)) {
      alert('Use letras, números, - e _ (pastas com /), com extensão .yaml, .yml, .json, .md ou .txt.');
      return;
    }
    if (nome in this.arquivos) {
      alert('Já existe um arquivo com esse nome.');
      return;
    }
    this.arquivos[nome] = EH_MANIFESTO.test(nome) && !nome.endsWith('.json') ? `# ${nome}\n` : '';
    this.aoMudar(this.arquivos);
    this.abrir(nome);
  }
}

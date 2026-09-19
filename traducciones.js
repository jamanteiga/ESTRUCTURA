// traducciones.js — Diccionario central de textos traducibles de ESTRUCTURA.
// Piloto: cubre el menú lateral (sidebar) de arbol.html.
// Cada clave apunta a un objeto { es, en, pt, ko, gl }.
// Para añadir un idioma nuevo, basta con añadir su código a cada entrada
// (y a IDIOMAS_DISPONIBLES en i18n.js) — no hace falta tocar el HTML.

const TRADUCCIONES = {

  // Buscador
  'buscador.placeholder': {
    es: '🔍 ¿Qué estás buscando?',
    en: '🔍 What are you looking for?',
    pt: '🔍 O que você está procurando?',
    ko: '🔍 무엇을 찾고 계신가요?',
    gl: '🔍 Que estás a buscar?'
  },

  // Títulos de sección del menú
  'menu.navegacion.titulo': { es: 'Navegación', en: 'Navigation', pt: 'Navegação', ko: '탐색', gl: 'Navegación' },
  'menu.miTrabajo.titulo': { es: 'Mi trabajo', en: 'My work', pt: 'Meu trabalho', ko: '내 작업', gl: 'O meu traballo' },
  'menu.bloques.titulo': { es: 'Bloques', en: 'Blocks', pt: 'Blocos', ko: '블록', gl: 'Bloques' },
  'menu.filtros.titulo': { es: 'Filtros', en: 'Filters', pt: 'Filtros', ko: '필터', gl: 'Filtros' },
  'menu.herramientas.titulo': { es: 'Herramientas', en: 'Tools', pt: 'Ferramentas', ko: '도구', gl: 'Ferramentas' },
  'menu.apariencia.titulo': { es: 'Apariencia', en: 'Appearance', pt: 'Aparência', ko: '모양', gl: 'Aparencia' },

  // Navegación
  'nav.inicio': { es: 'Inicio', en: 'Home', pt: 'Início', ko: '홈', gl: 'Inicio' },
  'nav.idiomas': { es: 'Idiomas', en: 'Languages', pt: 'Idiomas', ko: '언어', gl: 'Idiomas' },
  'nav.logs': { es: 'Logs', en: 'Logs', pt: 'Logs', ko: '로그', gl: 'Rexistros' },
  'nav.comunicaciones': { es: 'Comunicaciones', en: 'Communications', pt: 'Comunicações', ko: '커뮤니케이션', gl: 'Comunicacións' },
  'nav.anadirBuque': { es: 'Añadir Buque', en: 'Add Vessel', pt: 'Adicionar Navio', ko: '선박 추가', gl: 'Engadir Buque' },
  'nav.pegarBuque': { es: 'Pegar buque copiado', en: 'Paste copied vessel', pt: 'Colar navio copiado', ko: '복사한 선박 붙여넣기', gl: 'Pegar buque copiado' },
  'nav.resumen': { es: 'Resumen', en: 'Summary', pt: 'Resumo', ko: '요약', gl: 'Resumo' },
  'nav.kanban': { es: 'Kanban', en: 'Kanban', pt: 'Kanban', ko: '칸반', gl: 'Kanban' },
  'nav.comentariosPendientes': { es: 'Comentarios pendientes de modelo', en: 'Pending model comments', pt: 'Comentários pendentes do modelo', ko: '모델 대기 중인 댓글', gl: 'Comentarios pendentes de modelo' },
  'nav.usuarios': { es: 'Usuarios', en: 'Users', pt: 'Usuários', ko: '사용자', gl: 'Usuarios' },
  'nav.panelAdmin': { es: 'Panel de administración', en: 'Admin panel', pt: 'Painel de administração', ko: '관리자 패널', gl: 'Panel de administración' },
  'nav.backup': { es: 'Backup', en: 'Backup', pt: 'Backup', ko: '백업', gl: 'Copia de seguridade' },
  'nav.cerrarSesion': { es: 'Cerrar sesión', en: 'Log out', pt: 'Sair', ko: '로그아웃', gl: 'Pechar sesión' },

  // Submenú Resumen
  'resumen.alertas': { es: 'Alertas', en: 'Alerts', pt: 'Alertas', ko: '알림', gl: 'Alertas' },
  'resumen.avanceHitos': { es: 'Avance vs hitos', en: 'Progress vs milestones', pt: 'Avanço vs marcos', ko: '진행 대 마일스톤', gl: 'Avance vs fitos' },
  'resumen.avances': { es: 'Avances', en: 'Progress', pt: 'Avanços', ko: '진행 상황', gl: 'Avances' },
  'resumen.cambiosModelo': { es: 'Cambios de modelo', en: 'Model changes', pt: 'Alterações de modelo', ko: '모델 변경', gl: 'Cambios de modelo' },
  'resumen.cargaTrabajo': { es: 'Carga de trabajo', en: 'Workload', pt: 'Carga de trabalho', ko: '작업량', gl: 'Carga de traballo' },
  'resumen.colaRevision': { es: 'Cola de revisión', en: 'Review queue', pt: 'Fila de revisão', ko: '검토 대기열', gl: 'Cola de revisión' },
  'resumen.gantt': { es: 'Gantt', en: 'Gantt', pt: 'Gantt', ko: '간트', gl: 'Gantt' },
  'resumen.hitos': { es: 'Hitos', en: 'Milestones', pt: 'Marcos', ko: '마일스톤', gl: 'Fitos' },
  'resumen.kpis': { es: 'KPIs', en: 'KPIs', pt: 'KPIs', ko: 'KPI', gl: 'KPIs' },
  'resumen.pendienteDudas': { es: 'Pendiente de dudas', en: 'Pending questions', pt: 'Pendente de dúvidas', ko: '문의 대기 중', gl: 'Pendente de dúbidas' },
  'resumen.previsionCarga': { es: 'Previsión de carga', en: 'Workload forecast', pt: 'Previsão de carga', ko: '작업량 예측', gl: 'Previsión de carga' },
  'resumen.rechazados': { es: 'Rechazados', en: 'Rejected', pt: 'Rejeitados', ko: '거부됨', gl: 'Rexeitados' },
  'resumen.resumenGeneral': { es: 'Resumen general', en: 'Overview', pt: 'Resumo geral', ko: '전체 요약', gl: 'Resumo xeral' },
  'resumen.sinAsignar': { es: 'Sin asignar', en: 'Unassigned', pt: 'Não atribuído', ko: '미할당', gl: 'Sen asignar' },

  // Mi trabajo
  'mitrabajo.listaHoy': { es: 'Mi lista de hoy', en: 'My list for today', pt: 'Minha lista de hoje', ko: '오늘의 목록', gl: 'A miña lista de hoxe' },
  'mitrabajo.historial': { es: 'Mi historial', en: 'My history', pt: 'Meu histórico', ko: '내 기록', gl: 'O meu historial' },
  'mitrabajo.favoritas': { es: 'Favoritas y recientes', en: 'Favorites and recent', pt: 'Favoritos e recentes', ko: '즐겨찾기 및 최근 항목', gl: 'Favoritas e recentes' },
  'mitrabajo.avisoRechazo': { es: 'Avisarme si me rechazan una tarea', en: 'Notify me if a task is rejected', pt: 'Avise-me se uma tarefa for rejeitada', ko: '작업이 거부되면 알림', gl: 'Avisarme se me rexeitan unha tarefa' },
  'mitrabajo.modoLigero': { es: 'Modo ligero para el taller', en: 'Lightweight mode for the workshop', pt: 'Modo leve para a oficina', ko: '작업장용 경량 모드', gl: 'Modo lixeiro para o taller' },

  // Bloques
  'bloques.bloques': { es: 'Bloques', en: 'Blocks', pt: 'Blocos', ko: '블록', gl: 'Bloques' },
  'bloques.contraerTodo': { es: 'Contraer todo', en: 'Collapse all', pt: 'Recolher tudo', ko: '모두 접기', gl: 'Contraer todo' },
  'bloques.expandirTodo': { es: 'Expandir todo', en: 'Expand all', pt: 'Expandir tudo', ko: '모두 펼치기', gl: 'Expandir todo' },
  'bloques.expandirSinSub': { es: 'Expandir (sin Subbloques)', en: 'Expand (without sub-blocks)', pt: 'Expandir (sem sub-blocos)', ko: '펼치기 (하위 블록 제외)', gl: 'Expandir (sen Subbloques)' },
  'bloques.expandirSolo': { es: 'Expandir solo bloques', en: 'Expand blocks only', pt: 'Expandir somente blocos', ko: '블록만 펼치기', gl: 'Expandir só bloques' },
  'bloques.expandirPorBloque': { es: 'Expandir por bloque', en: 'Expand by block', pt: 'Expandir por bloco', ko: '블록별로 펼치기', gl: 'Expandir por bloque' },
  'bloques.vistaSimplificada': { es: 'Vista simplificada (solo colores)', en: 'Simplified view (colors only)', pt: 'Vista simplificada (somente cores)', ko: '단순 보기 (색상만)', gl: 'Vista simplificada (só cores)' },

  // Filtros
  'filtros.misTareas': { es: 'Ver solo mis tareas', en: 'Show only my tasks', pt: 'Ver apenas minhas tarefas', ko: '내 작업만 보기', gl: 'Ver só as miñas tarefas' },
  'filtros.verTareasDe': { es: 'Ver tareas de: Todos', en: 'Show tasks from: All', pt: 'Ver tarefas de: Todos', ko: '작업 보기: 전체', gl: 'Ver tarefas de: Todos' },
  'filtros.porEstadoTodos': { es: 'Por estado: Todos', en: 'By status: All', pt: 'Por status: Todos', ko: '상태별: 전체', gl: 'Por estado: Todos' },
  'filtros.bloqueados': { es: 'Elementos bloqueados', en: 'Locked items', pt: 'Itens bloqueados', ko: '잠긴 항목', gl: 'Elementos bloqueados' },
  'filtros.mostrarDesactivados': { es: 'Mostrar desactivados', en: 'Show disabled', pt: 'Mostrar desativados', ko: '비활성 항목 표시', gl: 'Amosar desactivados' },

  // Estados (opciones del filtro "Por estado")
  'estado.sinAsignar': { es: 'Sin asignar', en: 'Unassigned', pt: 'Não atribuído', ko: '미할당', gl: 'Sen asignar' },
  'estado.pendienteHacer': { es: 'Pendiente de hacer', en: 'Pending', pt: 'Pendente', ko: '대기 중', gl: 'Pendente de facer' },
  'estado.enProceso': { es: 'En proceso', en: 'In progress', pt: 'Em andamento', ko: '진행 중', gl: 'En proceso' },
  'estado.pendienteRevision': { es: 'Pendiente de revisión', en: 'Pending review', pt: 'Pendente de revisão', ko: '검토 대기 중', gl: 'Pendente de revisión' },
  'estado.pendienteDudas': { es: 'Pendiente de dudas', en: 'Pending questions', pt: 'Pendente de dúvidas', ko: '문의 대기 중', gl: 'Pendente de dúbidas' },
  'estado.pendienteCambiosModelo': { es: 'Pendiente de cambios de modelo', en: 'Pending model changes', pt: 'Pendente de alterações de modelo', ko: '모델 변경 대기 중', gl: 'Pendente de cambios de modelo' },
  'estado.aprobado': { es: 'Aprobado', en: 'Approved', pt: 'Aprovado', ko: '승인됨', gl: 'Aprobado' },
  'estado.rechazado': { es: 'Rechazado', en: 'Rejected', pt: 'Rejeitado', ko: '거부됨', gl: 'Rexeitado' },
  'estado.mezcla': { es: 'Estados mezclados', en: 'Mixed statuses', pt: 'Status misturados', ko: '혼합 상태', gl: 'Estados mesturados' },

  // Herramientas
  'herramientas.seleccionMultiple': { es: 'Selección múltiple', en: 'Multiple selection', pt: 'Seleção múltipla', ko: '다중 선택', gl: 'Selección múltiple' },
  'herramientas.avance': { es: 'Avance', en: 'Progress', pt: 'Avanço', ko: '진행', gl: 'Avance' },
  'herramientas.tiempos': { es: 'Tiempos', en: 'Times', pt: 'Tempos', ko: '시간', gl: 'Tempos' },
  'herramientas.importarExcel': { es: 'Importar Excel', en: 'Import Excel', pt: 'Importar Excel', ko: '엑셀 가져오기', gl: 'Importar Excel' },
  'herramientas.comprobarDuplicados': { es: 'Comprobar duplicados', en: 'Check duplicates', pt: 'Verificar duplicados', ko: '중복 확인', gl: 'Comprobar duplicados' },
  'herramientas.exportarExcel': { es: 'Exportar árbol a Excel', en: 'Export tree to Excel', pt: 'Exportar árvore para Excel', ko: '트리를 엑셀로 내보내기', gl: 'Exportar árbore a Excel' },
  'herramientas.verPapelera': { es: 'Ver papelera', en: 'View trash', pt: 'Ver lixeira', ko: '휴지통 보기', gl: 'Ver papeleira' },

  // Apariencia
  'apariencia.alternarTema': { es: 'Alternar tema', en: 'Toggle theme', pt: 'Alternar tema', ko: '테마 전환', gl: 'Alternar tema' },
  'apariencia.desplegable': { es: 'Desplegable', en: 'Collapsible', pt: 'Recolhível', ko: '접이식', gl: 'Despregable' },
  'apariencia.fijo': { es: 'Fijo en la izquierda', en: 'Fixed on the left', pt: 'Fixo à esquerda', ko: '왼쪽 고정', gl: 'Fixo á esquerda' },

  // Ejemplo de texto dinámico (demuestra t() con variables, no solo data-i18n estático)
  'cascada.contador': {
    es: 'Se aplicará a {n} tarea(s) seleccionada(s) (no cuenta los nodos de documentación tipo Modelo/Plano de corte/Windchill), en el orden en que aparecen en el árbol.',
    en: 'This will apply to {n} selected task(s) (documentation nodes such as Model/Cut plan/Windchill are not counted), in the order they appear in the tree.',
    pt: 'Isto será aplicado a {n} tarefa(s) selecionada(s) (os nós de documentação do tipo Modelo/Plano de corte/Windchill não são contados), na ordem em que aparecem na árvore.',
    ko: '선택한 {n}개 작업에 적용됩니다 (모델/절단 도면/Windchill과 같은 문서 노드는 포함되지 않음), 트리에 나타나는 순서대로 적용됩니다.',
    gl: 'Aplicarase a {n} tarefa(s) seleccionada(s) (non conta os nodos de documentación tipo Modelo/Plano de corte/Windchill), na orde en que aparecen na árbore.'
  }

};

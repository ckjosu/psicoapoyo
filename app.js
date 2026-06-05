/**
 * PsicoApoyo - app.js
 * TacoCoders | ITESCAM 2025
 */
(function () {
  'use strict';

  /* ==========================================================
     STATE MANAGER
  ========================================================== */
  var State = {
    KEY: 'psicoapoyo_state',
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(this.KEY)) || {}; }
      catch (e) { return {}; }
    },
    set: function (obj) {
      var s = this.get();
      for (var k in obj) s[k] = obj[k];
      sessionStorage.setItem(this.KEY, JSON.stringify(s));
    },
    clear: function () { sessionStorage.removeItem(this.KEY); },
    saveResult: function (score, nivel, persp) {
      this.set({ result: { score: score, nivel: nivel, persp: persp, ts: Date.now() } });
    },
    getResult: function () { return this.get().result || null; }
  };

  /* ==========================================================
     NAVBAR
  ========================================================== */
  function initNav() {
    var page = location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.navbar a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === page) {
        links[i].style.background = '#d4af37';
        links[i].style.borderRadius = '4px';
        links[i].style.color = '#fff';
        links[i].style.padding = '8px 16px';
      }
    }
    // Hamburguesa mobile
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;
    var btn = document.createElement('button');
    btn.innerHTML = '&#9776;';
    Object.assign(btn.style, {
      display: 'none', background: 'transparent', border: '2px solid white',
      color: 'white', fontSize: '1.4em', cursor: 'pointer', padding: '2px 10px',
      borderRadius: '5px', position: 'absolute', right: '20px',
      top: '50%', transform: 'translateY(-50%)'
    });
    navbar.style.position = 'relative';
    navbar.appendChild(btn);
    var ul = navbar.querySelector('ul');
    btn.addEventListener('click', function () {
      var open = ul.classList.toggle('nav-open');
      btn.innerHTML = open ? '&#10005;' : '&#9776;';
    });
    var style = document.createElement('style');
    style.textContent =
      '@media(max-width:768px){' +
        '.navbar button{display:block !important}' +
        '.navbar ul{flex-direction:column !important;align-items:center;max-height:0;overflow:hidden;transition:max-height .3s;padding:0 !important}' +
        '.navbar ul.nav-open{max-height:400px;padding:10px 0 15px !important}' +
        '.navbar ul li{margin:5px 0}' +
      '}';
    document.head.appendChild(style);
  }

  /* ==========================================================
     SELECTOR DE PERSPECTIVA
  ========================================================== */
  var perspectivaActual = 'personal'; // siempre tiene valor

  function seleccionarPerspectiva(tipo) {
    if (tipo !== 'familiar' && tipo !== 'personal') tipo = 'personal';
    perspectivaActual = tipo;
    State.set({ persp: tipo });

    // Resaltar botón activo
    var bF = document.getElementById('btn-familiar');
    var bP = document.getElementById('btn-personal');
    if (bF) { bF.style.background = tipo === 'familiar' ? '#003366' : '#546e7a'; bF.style.color = 'white'; }
    if (bP) { bP.style.background = tipo === 'personal'  ? '#003366' : '#546e7a'; bP.style.color = 'white'; }

    // Aviso contextual
    var av = document.getElementById('aviso-perspectiva');
    if (!av) return;
    av.style.display = 'block';
    av.style.borderRadius = '8px';
    av.style.padding = '12px 18px';
    av.style.marginBottom = '20px';
    av.style.maxWidth = '700px';
    av.style.marginLeft = 'auto';
    av.style.marginRight = 'auto';
    if (tipo === 'familiar') {
      av.style.background = '#e8f5e9';
      av.style.border = '2px solid #4caf50';
      av.style.color = '#2e7d32';
      av.innerHTML = '<strong>Modo familiar / amigo/a:</strong> Responde pensando en la persona que te preocupa.';
    } else {
      av.style.background = '#e3f2fd';
      av.style.border = '2px solid #1976d2';
      av.style.color = '#0d47a1';
      av.innerHTML = '<strong>Modo personal:</strong> Responde pensando en como te has sentido tu. Tu privacidad esta protegida.';
    }
  }

  /* ==========================================================
     ENCUESTA
  ========================================================== */
  var PESOS = { q1: 3, q2: 1, q3: 1, q4: 1, q5: 3, q6: 2, q7: 1, q8: 1 };
  var PREGUNTAS = ['q1','q2','q3','q4','q5','q6','q7','q8'];

  function initEncuesta() {
    // Highlight al seleccionar
    var labels = document.querySelectorAll('.opciones label');
    for (var i = 0; i < labels.length; i++) {
      (function (lbl) {
        var radio = lbl.querySelector('input[type=radio]');
        if (!radio) return;
        radio.addEventListener('change', function () {
          var grupo = document.querySelectorAll('input[name=' + radio.name + ']');
          for (var j = 0; j < grupo.length; j++) grupo[j].parentElement.classList.remove('seleccionada');
          lbl.classList.add('seleccionada');
          var card = lbl.closest('.pregunta-card');
          if (card) card.style.border = '';
        });
      })(labels[i]);
    }
    // Restaurar perspectiva guardada
    var saved = State.get().persp;
    if (saved) seleccionarPerspectiva(saved);
  }

  function calcularResultado() {
    // Verificar que todas esten respondidas
    var missing = [];
    for (var i = 0; i < PREGUNTAS.length; i++) {
      if (!document.querySelector('input[name=' + PREGUNTAS[i] + ']:checked')) {
        missing.push(PREGUNTAS[i]);
      }
    }
    if (missing.length > 0) {
      mostrarError('Por favor responde todas las preguntas. Faltan ' + missing.length + '.');
      var first = document.querySelector('input[name=' + missing[0] + ']');
      if (first) {
        var card = first.closest('.pregunta-card');
        if (card) { card.style.border = '2px solid #e53935'; card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
      return;
    }

    // Calcular puntaje
    var total = 0, maxPosible = 0;
    for (var p in PESOS) {
      if (!PESOS.hasOwnProperty(p)) continue;
      var val = parseInt(document.querySelector('input[name=' + p + ']:checked').value, 10);
      total += val * PESOS[p];
      maxPosible += 3 * PESOS[p];
    }

    // Flag critico
    var q1 = parseInt(document.querySelector('input[name=q1]:checked').value, 10);
    var q5 = parseInt(document.querySelector('input[name=q5]:checked').value, 10);
    var critico = (q1 >= 2 || q5 >= 2);

    var pct = total / maxPosible;
    var nivel = (critico || pct >= 0.55) ? 'rojo' : (pct >= 0.28) ? 'amarillo' : 'verde';
    var persp = perspectivaActual || 'personal';

    State.saveResult(total, nivel, persp);

    // Ocultar formulario
    var form = document.getElementById('encuesta-form');
    if (form) form.style.display = 'none';

    // Mostrar resultado
    mostrarResultado(nivel, persp);
  }

  function mostrarError(msg) {
    var el = document.getElementById('encuesta-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'encuesta-error';
      el.style.background = '#ffebee';
      el.style.border = '2px solid #e53935';
      el.style.borderRadius = '8px';
      el.style.padding = '12px 20px';
      el.style.margin = '10px auto';
      el.style.color = '#b71c1c';
      el.style.fontWeight = '600';
      el.style.textAlign = 'center';
      el.style.maxWidth = '700px';
      var form = document.getElementById('encuesta-form');
      if (form) form.parentNode.insertBefore(el, form);
    }
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { el.style.display = 'none'; }, 5000);
  }

  function reiniciarEncuesta() {
    State.clear();
    perspectivaActual = 'personal';

    var els = ['resultado', 'encuesta-error', 'aviso-perspectiva'];
    for (var i = 0; i < els.length; i++) {
      var el = document.getElementById(els[i]);
      if (el) el.style.display = 'none';
    }

    var form = document.getElementById('encuesta-form');
    if (form) {
      form.style.display = 'block';
      var radios = form.querySelectorAll('input[type=radio]');
      for (var i = 0; i < radios.length; i++) radios[i].checked = false;
      var cards = form.querySelectorAll('.pregunta-card');
      for (var i = 0; i < cards.length; i++) cards[i].style.border = '';
      var lbls = form.querySelectorAll('label');
      for (var i = 0; i < lbls.length; i++) lbls[i].classList.remove('seleccionada');
      var bF = document.getElementById('btn-familiar');
      var bP = document.getElementById('btn-personal');
      if (bF) { bF.style.background = '#546e7a'; }
      if (bP) { bP.style.background = '#546e7a'; }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ==========================================================
     SEMAFORO + RESULTADO
  ========================================================== */
  var NIVELES = {
    verde:    { titulo: 'Bajo Riesgo',    ctColor: '#2e7d32', bgColor: '#e8f5e9', bdColor: '#4caf50', recColor: '#388e3c' },
    amarillo: { titulo: 'Riesgo Medio',   ctColor: '#e65100', bgColor: '#fff8e1', bdColor: '#ffb300', recColor: '#e65100' },
    rojo:     { titulo: 'Riesgo Alto — Se Requiere Atencion Inmediata',
                                          ctColor: '#b71c1c', bgColor: '#ffebee', bdColor: '#e53935', recColor: '#c62828' }
  };

  var CONTENIDO = {
    personal: {
      verde: {
        desc: 'Tu estado emocional parece estable. Te compartimos recursos de bienestar para mantener tu salud mental.',
        tituloRec: 'Recomendaciones para ti:',
        recs: [
          'Practica mindfulness o meditacion diariamente, aunque sea 10 minutos.',
          'El ejercicio fisico regular mejora tu estado de animo de manera natural.',
          'Mantén tus vinculos sociales activos; conecta con quienes te importan.',
          'Cuida tu sueno y alimentacion como prioridad de salud.',
          'Escribe un diario de gratitud: anota 3 cosas positivas al dia.'
        ],
        btns: [{ texto: 'Ver Recursos de Bienestar', href: 'recursos.html', clase: 'btn btn-primary' }]
      },
      amarillo: {
        desc: 'Estas atravesando un momento dificil. No tienes que enfrentarlo solo/a. Te recomendamos buscar orientacion profesional.',
        tituloRec: 'Recomendaciones para ti:',
        recs: [
          'Si los pensamientos negativos aumentan, busca ayuda de inmediato.',
          'Habla con alguien de confianza hoy mismo.',
          'Puedes llamar a la Linea de la Vida: 800-911-2000 (gratuita, 24/7).',
          'Considera agendar una cita con un psicologo esta semana.',
          'Evita el alcohol u otras sustancias cuando te sientas asi.'
        ],
        btns: [
          { texto: 'Contactar un Psicologo', href: 'contacto.html', clase: 'btn btn-primary' },
          { texto: 'Ver Recursos',           href: 'recursos.html', clase: 'btn btn-secondary' }
        ]
      },
      rojo: {
        desc: 'Tu bienestar es la prioridad. Lo que sientes es real y valido. Hay personas capacitadas para ayudarte ahora mismo.',
        tituloRec: 'Pasos importantes para ti ahora:',
        recs: [
          'Por favor llama ahora mismo a una linea de crisis (numeros abajo).',
          'Busca a alguien de confianza que pueda acompanarte en este momento.',
          'Ve a urgencias si sientes que estas en peligro inmediato.',
          'Si tienes acceso a medios para hacerte dano, ponlos fuera de tu alcance.',
          'El dolor que sientes ahora puede cambiar. La crisis es temporal.'
        ],
        btns: [
          { texto: 'Linea de la Vida: 800-911-2000', href: 'tel:800-911-2000', clase: 'btn btn-emergency' },
          { texto: 'SAPTEL: 55 5259-8121',           href: 'tel:5552598121',   clase: 'btn btn-emergency' },
          { texto: 'Contactar Psicologo',            href: 'contacto.html',    clase: 'btn btn-primary'   }
        ]
      }
    },
    familiar: {
      verde: {
        desc: 'Segun tus respuestas, la persona parece estar en un estado emocional estable. Mantener el apoyo y la comunicacion abierta siempre es positivo.',
        tituloRec: 'Recomendaciones para ti como familiar:',
        recs: [
          'Mantén conversaciones abiertas y sin juicios con tu ser querido.',
          'Sigue atento/a a cualquier cambio en su comportamiento o animo.',
          'Fomenta sus redes de apoyo: amigos, familia, actividades sociales.',
          'Tu presencia y escucha activa son el mejor apoyo que puedes dar.'
        ],
        btns: [{ texto: 'Ver Guia para Familiares', href: 'recursos.html', clase: 'btn btn-primary' }]
      },
      amarillo: {
        desc: 'Tu ser querido podria estar pasando por un momento dificil. Es importante actuar con calma pero sin ignorar las senales.',
        tituloRec: 'Pasos a seguir como familiar:',
        recs: [
          'Busca un momento tranquilo para hablar sin presion ni juicios.',
          'Escucha sin minimizar lo que siente.',
          'Orientale a llamar al 800-911-2000 (gratuita, 24/7).',
          'Considera acompanarle a una consulta con un psicologo esta semana.',
          'Cuidate tambien tu — apoyar a alguien en crisis tambien te afecta.'
        ],
        btns: [
          { texto: 'Hablar con un Psicologo', href: 'contacto.html', clase: 'btn btn-primary'   },
          { texto: 'Guia para Familiares',    href: 'recursos.html', clase: 'btn btn-secondary' }
        ]
      },
      rojo: {
        desc: 'Las respuestas indican un nivel de riesgo alto. Como familiar o amigo/a, tu papel es fundamental. Actua de inmediato.',
        tituloRec: 'Pasos urgentes para ti como familiar:',
        recs: [
          'No dejes sola a la persona mientras no estes seguro/a de que esta a salvo.',
          'Llama ahora al 800-911-2000 para recibir orientacion de un especialista.',
          'Si hay peligro inmediato, llama al 911 o llevale a urgencias.',
          'Retira del entorno cualquier medio que pueda usar para hacerse dano.',
          'No prometas guardar el secreto si sabes que esta en peligro.'
        ],
        btns: [
          { texto: 'Llamar: 800-911-2000', href: 'tel:800-911-2000', clase: 'btn btn-emergency' },
          { texto: 'Llamar 911',           href: 'tel:911',           clase: 'btn btn-emergency' },
          { texto: 'Contactar Psicologo',  href: 'contacto.html',     clase: 'btn btn-primary'   }
        ]
      }
    }
  };

  function crearSemaforo(nivel) {
    // Contenedor exterior (caja negra redondeada)
    var caja = document.createElement('div');
    caja.style.display = 'inline-flex';
    caja.style.flexDirection = 'column';
    caja.style.alignItems = 'center';
    caja.style.background = '#222';
    caja.style.borderRadius = '18px';
    caja.style.padding = '14px 20px';
    caja.style.gap = '10px';
    caja.style.marginBottom = '20px';

    var luces = [
      { id: 'rojo',     onColor: '#e53935', offColor: '#ffcdd2', label: 'ALTO'  },
      { id: 'amarillo', onColor: '#ffb300', offColor: '#fff9c4', label: 'MEDIO' },
      { id: 'verde',    onColor: '#4caf50', offColor: '#c8e6c9', label: 'BAJO'  }
    ];

    for (var i = 0; i < luces.length; i++) {
      var luzData = luces[i];
      var encendida = (luzData.id === nivel);

      var wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '4px';

      var circulo = document.createElement('div');
      circulo.style.width = '50px';
      circulo.style.height = '50px';
      circulo.style.borderRadius = '50%';
      circulo.style.background = encendida ? luzData.onColor : luzData.offColor;
      if (encendida) {
        circulo.style.boxShadow = '0 0 18px 5px ' + luzData.onColor;
      }

      var etiq = document.createElement('span');
      etiq.textContent = luzData.label;
      etiq.style.fontSize = '0.65em';
      etiq.style.fontWeight = encendida ? '700' : '400';
      etiq.style.color = encendida ? luzData.onColor : '#666';
      etiq.style.letterSpacing = '1px';

      wrap.appendChild(circulo);
      wrap.appendChild(etiq);
      caja.appendChild(wrap);
    }

    return caja;
  }

  function mostrarResultado(nivel, persp) {
    var contenedor = document.getElementById('resultado');
    if (!contenedor) return;

    if (!NIVELES[nivel]) nivel = 'verde';
    if (!CONTENIDO[persp]) persp = 'personal';

    var nv = NIVELES[nivel];
    var ct = CONTENIDO[persp][nivel];

    // Limpiar y configurar contenedor
    contenedor.innerHTML = '';
    contenedor.style.display = 'block';
    contenedor.style.background = nv.bgColor;
    contenedor.style.border = '3px solid ' + nv.bdColor;
    contenedor.style.borderRadius = '15px';
    contenedor.style.padding = '35px 25px';
    contenedor.style.maxWidth = '700px';
    contenedor.style.margin = '40px auto 0';
    contenedor.style.textAlign = 'center';

    // Etiqueta de perspectiva
    var etiq = document.createElement('div');
    etiq.style.marginBottom = '12px';
    var badge = document.createElement('span');
    badge.style.borderRadius = '20px';
    badge.style.padding = '4px 14px';
    badge.style.fontSize = '0.82em';
    badge.style.fontWeight = '600';
    badge.style.display = 'inline-block';
    if (persp === 'familiar') {
      badge.textContent = 'Resultado para Familiar / Amigo/a';
      badge.style.background = '#e8f5e9';
      badge.style.color = '#2e7d32';
      badge.style.border = '1px solid #4caf50';
    } else {
      badge.textContent = 'Resultado Personal';
      badge.style.background = '#e3f2fd';
      badge.style.color = '#0d47a1';
      badge.style.border = '1px solid #1976d2';
    }
    etiq.appendChild(badge);
    contenedor.appendChild(etiq);

    // Semaforo
    contenedor.appendChild(crearSemaforo(nivel));

    // Titulo
    var titulo = document.createElement('h2');
    titulo.textContent = nv.titulo;
    titulo.style.color = nv.ctColor;
    titulo.style.margin = '0 0 15px';
    titulo.style.fontSize = '1.7em';
    contenedor.appendChild(titulo);

    // Descripcion
    var desc = document.createElement('p');
    desc.textContent = ct.desc;
    desc.style.fontSize = '1.05em';
    desc.style.color = '#444';
    desc.style.marginBottom = '20px';
    contenedor.appendChild(desc);

    // Caja de recomendaciones
    var caja = document.createElement('div');
    caja.style.background = 'white';
    caja.style.border = '1px solid ' + nv.bdColor;
    caja.style.borderRadius = '10px';
    caja.style.padding = '20px 22px';
    caja.style.textAlign = 'left';
    caja.style.margin = '15px 0';

    var tituloRec = document.createElement('h3');
    tituloRec.textContent = ct.tituloRec;
    tituloRec.style.color = nv.recColor;
    tituloRec.style.margin = '0 0 12px';
    caja.appendChild(tituloRec);

    var emojis = { personal: { verde: '🧘 🏃 🤝 😴 📝'.split(' '), amarillo: '⚠️ 💬 📞 🏥 🚫'.split(' '), rojo: '🆘 🤝 🏥 📵 💙'.split(' ') },
                   familiar: { verde: '🗣️ 👀 🤝 💙'.split(' '), amarillo: '💬 👂 📞 🏥 💙'.split(' '), rojo: '🛑 📞 🏥 🔒 💙'.split(' ') } };
    var emoList = emojis[persp][nivel] || [];

    for (var i = 0; i < ct.recs.length; i++) {
      var p = document.createElement('p');
      var emo = emoList[i] ? emoList[i] + ' ' : '';
      p.textContent = emo + ct.recs[i];
      p.style.margin = '8px 0';
      p.style.fontSize = '0.95em';
      caja.appendChild(p);
    }
    contenedor.appendChild(caja);

    // Botones
    var btnWrap = document.createElement('div');
    btnWrap.style.display = 'flex';
    btnWrap.style.flexWrap = 'wrap';
    btnWrap.style.gap = '10px';
    btnWrap.style.justifyContent = 'center';
    btnWrap.style.marginTop = '20px';

    for (var j = 0; j < ct.btns.length; j++) {
      var bData = ct.btns[j];
      var a = document.createElement('a');
      a.textContent = bData.texto;
      a.href = bData.href;
      a.className = bData.clase;
      a.style.margin = '5px';
      a.style.textDecoration = 'none';
      btnWrap.appendChild(a);
    }
    contenedor.appendChild(btnWrap);

    // Nota legal
    var nota = document.createElement('p');
    nota.textContent = 'Esta evaluacion no es un diagnostico clinico. Consulta siempre a un profesional de salud mental.';
    nota.style.fontSize = '0.8em';
    nota.style.color = '#888';
    nota.style.marginTop = '22px';
    contenedor.appendChild(nota);

    // Boton reiniciar
    var btnReinicia = document.createElement('button');
    btnReinicia.textContent = 'Volver a Evaluar';
    btnReinicia.style.background = '#546e7a';
    btnReinicia.style.color = 'white';
    btnReinicia.style.border = 'none';
    btnReinicia.style.borderRadius = '50px';
    btnReinicia.style.padding = '10px 25px';
    btnReinicia.style.fontSize = '0.9em';
    btnReinicia.style.cursor = 'pointer';
    btnReinicia.style.marginTop = '12px';
    btnReinicia.addEventListener('click', reiniciarEncuesta);
    contenedor.appendChild(btnReinicia);

    contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (nivel === 'rojo') mostrarBannerEmergencia();
  }

  /* ==========================================================
     CHAT
  ========================================================== */
  var RESPUESTAS = [
    // CRISIS INMEDIATA — rojo
    { claves: ['morir','suicid','matar','quitarme la vida','no quiero vivir','acabar con todo','no vale la pena vivir'],
      texto: 'Escucho que estas en un momento muy dificil y eso me importa. Por favor llama ahora a la Linea de la Vida: 800-911-2000 (gratuita, 24/7). No tienes que pasar esto solo/a, hay personas capacitadas esperando escucharte.', nivel: 'rojo' },
    { claves: ['hacerme dano','lastimarme','cortarme','hacerme algo'],
      texto: 'Gracias por contarme esto. Lo que sientes es real y merece atencion. Llama al 800-911-2000 ahora mismo, son especialistas y estan para escucharte sin juzgarte.', nivel: 'rojo' },
    { claves: ['no puedo mas','ya no aguanto','quiero desaparecer','no hay salida'],
      texto: 'Escucho cuanto dolor estas cargando en este momento. Eso es agotador. Por favor no enfrentes esto solo/a, llama al 800-911-2000 o escribe al formulario y un psicologo te contactara hoy.', nivel: 'rojo' },
    // FAMILIAR — amarillo
    { claves: ['mi hijo','mi hija','mi esposo','mi esposa','mi pareja','mi amigo','mi amiga','mi hermano','mi hermana','familiar','se quiere'],
      texto: 'Entiendo tu preocupacion por esa persona. Es muy valioso que estes buscando ayuda. Llama al 800-911-2000 donde pueden orientarte sobre como hablar con ella y que pasos seguir. Tu presencia puede marcar la diferencia.', nivel: 'amarillo' },
    { claves: ['como ayudar','no se que decirle','que hago','como hablar','como apoyar'],
      texto: 'Lo mas importante es escuchar sin juzgar y sin minimizar lo que siente. Puedes decirle: "Estoy aqui, me importas, no tienes que pasar esto solo/a." Evita dar consejos o decir "ya se te pasara". Un especialista puede orientarte mejor en el formulario de contacto.', nivel: 'amarillo' },
    // MALESTAR EMOCIONAL — amarillo
    { claves: ['me siento mal','siento mal','me siento','siento que','estoy mal','estoy triste','me siento triste'],
      texto: 'Lamento que estes pasando por un momento dificil. Lo que sientes es valido y merece atencion. Estoy aqui para escucharte. Si quieres, cuentame mas sobre como te sientes, o si prefieres hablar con un psicologo puedes llenar el formulario de contacto.', nivel: 'amarillo' },
    { claves: ['triste','deprimid','ansios','desesperado','desesperada','solo','sola','llorar','sin ganas','vacio','vacia','agotado','agotada'],
      texto: 'Gracias por compartir eso conmigo. Lo que describes merece atencion y apoyo profesional. No estas solo/a en esto. Un psicologo puede ayudarte a encontrar herramientas para sentirte mejor. Puedes contactar a la Dra. Eliza desde el formulario.', nivel: 'amarillo' },
    { claves: ['miedo','asustado','asustada','angustia','angustiado','preocupado','preocupada','nervioso','nerviosa'],
      texto: 'Entiendo que es dificil cargar con esa sensacion. El miedo y la angustia son senales de que algo necesita atencion. Aqui puedes encontrar apoyo. Escribenos al formulario y un especialista te orientara pronto.', nivel: 'amarillo' },
    { claves: ['no duermo','no como','sin apetito','no tengo ganas','no me importa nada'],
      texto: 'Esos cambios en el sueno y el apetito son senales importantes de que tu cuerpo y mente necesitan apoyo. Te recomiendo hablar con un especialista. Puedes contactar a la Dra. Eliza desde el formulario de esta pagina.', nivel: 'amarillo' },
    // AYUDA GENERAL
    { claves: ['ayuda','apoyo','necesito ayuda','quiero ayuda','orientacion','no se que hacer'],
      texto: 'Estoy aqui para orientarte. Puedes hablar con la Dra. Eliza por WhatsApp, videollamada o llenar el formulario de contacto mas abajo. Tambien puedes llamar al 800-911-2000 si necesitas ayuda ahora mismo.', nivel: 'amarillo' },
    // SALUDOS
    { claves: ['hola','buenos dias','buenas tardes','buenas noches','hi','hello','buenas'],
      texto: 'Hola, bienvenido/a a PsicoApoyo. Estoy aqui para escucharte y orientarte. Puedes contarme como te sientes o en que necesitas ayuda, ya sea para ti o para un familiar.', nivel: 'verde' },
    // BIEN — respuesta cuidadosa, no celebrar si puede estar en negacion
    { claves: ['estoy bien','todo bien','bien gracias','me siento bien'],
      texto: 'Me alegra que estes bien. Si en algun momento sientes que algo cambia o quieres hablar, aqui estamos. Tambien puedes hacer nuestra evaluacion emocional para conocer mejor tu estado de animo.', nivel: 'verde' },
    { claves: ['gracias','muchas gracias','te lo agradezco'],
      texto: 'De nada, para eso estamos. Recuerda que si en algun momento necesitas mas apoyo, puedes contactar directamente a la Dra. Eliza o llamar al 800-911-2000.', nivel: 'verde' }
  ];
  var DEFAULT_RESP = 'Gracias por escribirme. Quiero asegurarme de entenderte bien. Puedes contarme un poco mas como te sientes? Tu mensaje tambien fue enviado al psicologo y te respondera pronto. Si necesitas ayuda inmediata llama al 800-911-2000.';

  // ============================================================
  // CHAT — con identificación del usuario y BD
  // ============================================================
  var CHAT_SESION_ID  = localStorage.getItem('psicoapoyo_chat_sesion') || null;
  var CHAT_NOMBRE     = localStorage.getItem('psicoapoyo_chat_nombre') || null;
  var chatPolling     = null;
  var chatUltimosIds  = [];
  var chatIniciado    = CHAT_SESION_ID !== null;

  function initChat() {
    var input = document.getElementById('msg-input');
    if (input) input.addEventListener('keypress', function(e){ if(e.key==='Enter') enviarMensaje(); });
  }

  function abrirChat() {
    var box = document.getElementById('chat-box');
    if (!box) return;
    box.style.display = 'block';

    if (chatIniciado && CHAT_SESION_ID) {
      // Ya tiene sesión — cargar historial y activar polling
      cargarHistorialChat();
      if (!chatPolling) chatPolling = setInterval(verificarRespuestasPsicologo, 6000);
      var inp = document.getElementById('msg-input');
      if (inp) inp.focus();
      return;
    }

    // Primera vez — mostrar pantalla de nombre
    var msgs = document.getElementById('mensajes');
    if (msgs) {
      msgs.innerHTML = '';
      var bienvenida = document.createElement('div');
      bienvenida.style.cssText = 'background:#003366;color:white;padding:10px 14px;border-radius:12px;margin-bottom:10px;font-size:.88em;';
      bienvenida.textContent = 'Hola 👋 Bienvenido/a. ¿Cuál es tu nombre para que el psicólogo pueda identificarte?';
      msgs.appendChild(bienvenida);
    }

    // Ocultar input normal y mostrar input de nombre
    var areaInput = document.getElementById('chat-input-area');
    if (areaInput) areaInput.style.display = 'none';

    var areaNombre = document.getElementById('chat-nombre-area');
    if (areaNombre) {
      areaNombre.style.display = 'flex';
      var inpN = document.getElementById('inp-nombre-chat');
      if (inpN) { inpN.value = ''; inpN.focus(); }
    }
  }

  function confirmarNombreChat() {
    var inpN = document.getElementById('inp-nombre-chat');
    if (!inpN || !inpN.value.trim()) return;
    CHAT_NOMBRE = inpN.value.trim();

    // Crear sesión única con nombre
    var slug = CHAT_NOMBRE.replace(/ /g,'_').toLowerCase().substr(0,10);
    CHAT_SESION_ID = 'chat_' + slug + '_' + Date.now().toString(36);
    localStorage.setItem('psicoapoyo_chat_sesion', CHAT_SESION_ID);
    localStorage.setItem('psicoapoyo_chat_nombre', CHAT_NOMBRE);
    chatIniciado = true;

    // Cambiar a input normal
    var areaNombre = document.getElementById('chat-nombre-area');
    if (areaNombre) areaNombre.style.display = 'none';
    var areaInput = document.getElementById('chat-input-area');
    if (areaInput) areaInput.style.display = 'flex';

    // Mensaje de confirmación
    var msgs = document.getElementById('mensajes');
    if (msgs) {
      var div = document.createElement('div');
      div.style.cssText = 'background:#003366;color:white;padding:10px 14px;border-radius:12px;margin-bottom:10px;font-size:.88em;';
      div.textContent = 'Gracias ' + CHAT_NOMBRE + ' 😊 Estoy aquí para escucharte. ¿Cómo te sientes hoy?';
      msgs.appendChild(div);
    }

    var inp = document.getElementById('msg-input');
    if (inp) inp.focus();

    // Iniciar polling
    if (chatPolling) clearInterval(chatPolling);
    chatPolling = setInterval(verificarRespuestasPsicologo, 6000);
  }

  function cerrarChat() {
    var box = document.getElementById('chat-box');
    if (box) box.style.display = 'none';
    // NO limpiar sesión — se mantiene para cuando regrese
  }

  function cargarHistorialChat() {
    if (!CHAT_SESION_ID) return;
    fetch('api.php?accion=chat_mensajes&sesion_id=' + encodeURIComponent(CHAT_SESION_ID))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (!res.ok) return;
      var msgs = document.getElementById('mensajes');
      if (!msgs || !res.datos.length) return;
      msgs.innerHTML = '';
      chatUltimosIds = [];
      res.datos.forEach(function(m) {
        chatUltimosIds.push(m.id_mensaje);
        var esBot = m.remitente === 'psicologo';
        appendMsg(msgs, esBot ? '🩺 Psicólogo: ' + m.texto : m.texto, esBot, 'verde');
      });
    }).catch(function(){});
  }

  function verificarRespuestasPsicologo() {
    if (!CHAT_SESION_ID) return;
    fetch('api.php?accion=chat_mensajes&sesion_id=' + encodeURIComponent(CHAT_SESION_ID))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (!res.ok) return;
      var msgs = document.getElementById('mensajes');
      if (!msgs) return;
      (res.datos || []).forEach(function(m) {
        if (m.remitente === 'psicologo' && chatUltimosIds.indexOf(m.id_mensaje) === -1) {
          chatUltimosIds.push(m.id_mensaje);
          appendMsg(msgs, '🩺 Psicólogo: ' + m.texto, true, 'verde');
        }
      });
    }).catch(function(){});
  }

  function enviarMensaje() {
    var input = document.getElementById('msg-input');
    var msgs  = document.getElementById('mensajes');
    if (!input || !msgs || !input.value.trim()) return;
    if (!chatIniciado) { abrirChat(); return; }

    var texto = input.value.trim();
    input.value = '';

    // Mostrar mensaje del usuario
    appendMsg(msgs, '👤 ' + CHAT_NOMBRE + ': ' + texto, false, 'verde');

    // Guardar en BD
    fetch('api.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        accion:    'chat_enviar',
        sesion_id: CHAT_SESION_ID,
        texto:     '[' + CHAT_NOMBRE + '] ' + texto,
        remitente: 'usuario'
      })
    }).catch(function(){});

    // Respuesta del bot
    var resp = buscarRespuesta(texto.toLowerCase());
    var typing = appendTyping(msgs);
    setTimeout(function(){
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      appendMsg(msgs, resp.texto, true, resp.nivel);
      if (resp.nivel === 'rojo') mostrarBannerEmergencia();
    }, 900);
  }


  function buscarRespuesta(t) {
    for (var i = 0; i < RESPUESTAS.length; i++) {
      var r = RESPUESTAS[i];
      for (var j = 0; j < r.claves.length; j++) {
        if (t.indexOf(r.claves[j]) >= 0) return r;
      }
    }
    return { texto: DEFAULT_RESP, nivel: 'verde' };
  }

  function appendMsg(c, texto, esBot, nivel) {
    var bg    = esBot ? (nivel === 'rojo' ? '#ffebee' : nivel === 'amarillo' ? '#fff8e1' : '#003366') : '#e3f2fd';
    var color = esBot ? (nivel === 'rojo' ? '#b71c1c' : nivel === 'amarillo' ? '#5d4037' : 'white')  : '#1a237e';
    var d = document.createElement('div');
    d.textContent = texto;
    d.style.background = bg;
    d.style.color = color;
    d.style.padding = '10px 14px';
    d.style.borderRadius = '12px';
    d.style.marginBottom = '10px';
    d.style.fontSize = '0.88em';
    d.style.maxWidth = '85%';
    d.style.marginRight = esBot ? 'auto' : undefined;
    d.style.marginLeft  = esBot ? undefined : 'auto';
    d.style.textAlign   = esBot ? 'left' : 'right';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function appendTyping(c) {
    var d = document.createElement('div');
    d.textContent = 'Escribiendo...';
    d.style.background = '#f0f0f0';
    d.style.color = '#888';
    d.style.padding = '10px 14px';
    d.style.borderRadius = '12px';
    d.style.marginBottom = '10px';
    d.style.fontSize = '0.85em';
    d.style.fontStyle = 'italic';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    return d;
  }

  /* ==========================================================
     CONTACTO
  ========================================================== */
  function initContacto() {
    var btn = document.getElementById('btn-enviar-formulario');
    if (btn) btn.addEventListener('click', enviarFormulario);
    mostrarAvisoNivel();
    cargarPsicologosContacto();
  }

  function cargarPsicologosContacto() {
    var cont = document.getElementById('contactos-psis');
    if (!cont) return;

    fetch('api.php?accion=psicologos_contacto')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (!res.ok || !res.datos || !res.datos.length) {
        cont.innerHTML = tarjetaContactoDefault();
        return;
      }
      var html = '';
      res.datos.forEach(function(p) {
        var disp = p.disponible === 'disponible'
          ? '<span style="color:#2e7d32;font-weight:700;">✅ Disponible</span>'
          : '<span style="color:#e65100;font-weight:700;">⚠️ Disponibilidad limitada</span>';
        var bio = p.biografia ? '<p style="font-size:.88em;color:#555;margin:4px 0 10px;">'+p.biografia+'</p>' : '';

        html += '<div class="contact-method" style="border-left:4px solid #003366;">';
        html += '<h3>🩺 ' + p.nombre_completo + '</h3>';
        html += '<p style="font-size:.85em;color:#666;margin:2px 0 4px;">'+p.especialidad+'</p>';
        html += bio;
        html += '<p>' + disp + '</p>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;">';

        if (p.whatsapp) {
          var tel = p.whatsapp.replace(/\D/g,'');
          html += '<a href="https://wa.me/'+tel+'?text=Hola,%20necesito%20orientación%20psicológica" class="btn btn-whatsapp" target="_blank">📱 WhatsApp</a>';
        }
        if (p.correo) {
          html += '<a href="mailto:'+p.correo+'" class="btn btn-correo">📧 Correo</a>';
        }
        if (p.calendly) {
          html += '<a href="'+p.calendly+'" target="_blank" class="btn btn-primary">📹 Agendar Videollamada</a>';
        }
        html += '</div></div>';
      });
      cont.innerHTML = html;
    })
    .catch(function() {
      cont.innerHTML = tarjetaContactoDefault();
    });
  }

  function tarjetaContactoDefault() {
    return '<div class="contact-method" style="border-left:4px solid #003366;">'+
      '<h3>🩺 Dra. Eliza de la Torre</h3>'+
      '<p style="font-size:.85em;color:#666;">Psicóloga Clínica — ITESCAM</p>'+
      '<p><span style="color:#2e7d32;font-weight:700;">✅ Disponible</span></p>'+
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;">'+
        '<a href="https://wa.me/529999000000?text=Hola,%20necesito%20orientación" class="btn btn-whatsapp" target="_blank">📱 WhatsApp</a>'+
        '<a href="mailto:eliza@psicoapoyo.mx" class="btn btn-correo">📧 Correo</a>'+
        '<a href="https://calendly.com" target="_blank" class="btn btn-primary">📹 Videollamada</a>'+
      '</div>'+
    '</div>';
  }

  function mostrarAvisoNivel() {
    var r = State.getResult();
    var av = document.getElementById('aviso-nivel');
    if (!r || !av) return;
    var esFam = r.persp === 'familiar';
    var cfg = {
      verde:    { bg: '#e8f5e9', bd: '#4caf50', c: '#2e7d32', t: esFam ? 'Evaluacion: Riesgo Bajo. Te orientamos sobre como apoyar a tu ser querido.' : 'Tu evaluacion indica Bajo Riesgo.' },
      amarillo: { bg: '#fff8e1', bd: '#ffb300', c: '#e65100', t: esFam ? 'Evaluacion: Riesgo Medio. Te recomendamos hablar con un psicologo.' : 'Tu evaluacion indica Riesgo Medio.' },
      rojo:     { bg: '#ffebee', bd: '#e53935', c: '#b71c1c', t: esFam ? 'Evaluacion: Riesgo Alto. Contacta a un especialista ahora.' : 'Tu evaluacion indica Riesgo Alto. Contacta a un especialista ahora.' }
    };
    var cv = cfg[r.nivel];
    if (!cv) return;
    av.style.display = 'block';
    av.style.background = cv.bg;
    av.style.border = '2px solid ' + cv.bd;
    av.style.color = cv.c;
    av.style.borderRadius = '8px';
    av.style.padding = '12px 20px';
    av.style.marginBottom = '18px';
    av.style.fontWeight = '600';
    av.textContent = cv.t;
  }

  // ============================================================
  // FORMULARIO DE CONTACTO — envía al backend api.php
  // ============================================================
  var API_URL = 'api.php';

  window.enviarFormulario = enviarFormulario;
  function enviarFormulario() {
    var msg = document.getElementById('inp-mensaje');
    if (!msg || !msg.value.trim()) {
      mostrarAlertaFormulario('Por favor escribe brevemente la situación o qué necesitas.', false);
      return;
    }

    // Leer resultado del cuestionario guardado
    var nivel = 'verde', pct = null, persp = 'personal';
    try {
      var res = JSON.parse(sessionStorage.getItem('psicoapoyo_result') || 'null')
             || JSON.parse(localStorage.getItem('psicoapoyo_ultimo_resultado') || 'null');
      if (res) {
        nivel = res.nivel || 'verde';
        pct   = res.pct   !== undefined ? res.pct : null;
        persp = res.perspectiva || 'personal';
      }
    } catch(e) {}

    var datos = {
      accion:      'nueva_solicitud',
      nombre:      (document.getElementById('inp-nombre')   || {value:''}).value.trim() || 'Anónimo',
      contacto:    (document.getElementById('inp-contacto') || {value:''}).value.trim(),
      quien:       (document.getElementById('sel-quien')    || {value:''}).value,
      medio:       (document.getElementById('sel-medio')    || {value:''}).value,
      mensaje:     msg.value.trim(),
      nivel:       nivel,
      pct:         pct,
      perspectiva: persp
    };

    var btn = document.getElementById('btn-enviar-formulario');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(datos)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
      if (res.ok) {
        var msj = nivel === 'rojo'
          ? '⚠️ Tu solicitud URGENTE fue enviada al psicólogo. Si necesitas ayuda AHORA llama al 800-911-2000.'
          : '✅ Tu solicitud fue enviada. Un psicólogo te contactará pronto.';
        mostrarAlertaFormulario(msj, true);
        limpiarFormulario();
      } else {
        mostrarAlertaFormulario('Error al enviar: ' + (res.error || 'inténtalo de nuevo.'), false);
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
      mostrarAlertaFormulario('No se pudo conectar. Llama directamente al 800-911-2000.', false);
    });
  }

  function limpiarFormulario() {
    ['inp-nombre','inp-contacto','inp-mensaje'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['sel-medio','sel-quien'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
  }


  function mostrarAlertaFormulario(msg, ok) {
    var el = document.getElementById('alerta-form');
    if (!el) {
      el = document.createElement('div');
      el.id = 'alerta-form';
      var form = document.querySelector('.contact-form');
      if (form) form.insertBefore(el, form.firstChild);
    }
    el.style.padding = '14px 20px';
    el.style.borderRadius = '8px';
    el.style.marginBottom = '15px';
    el.style.fontWeight = '600';
    el.style.background = ok ? '#e8f5e9' : '#ffebee';
    el.style.color = ok ? '#2e7d32' : '#b71c1c';
    el.style.border = ok ? '2px solid #4caf50' : '2px solid #e53935';
    el.textContent = msg;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ==========================================================
     RECURSOS - ACORDEON FAQ
  ========================================================== */
  function initRecursos() {
    var btns = document.querySelectorAll('.faq-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var ans = btn.nextElementSibling;
          var open = !!ans.style.maxHeight;
          // Cerrar todos
          var all = document.querySelectorAll('.faq-answer');
          var allBtns = document.querySelectorAll('.faq-btn');
          for (var j = 0; j < all.length; j++) { all[j].style.maxHeight = null; all[j].style.opacity = '0'; }
          for (var j = 0; j < allBtns.length; j++) { allBtns[j].style.background = '#003366'; }
          // Abrir este si estaba cerrado
          if (!open) {
            ans.style.maxHeight = ans.scrollHeight + 'px';
            ans.style.opacity = '1';
            btn.style.background = '#00509e';
          }
        });
      })(btns[i]);
    }
  }

  /* ==========================================================
     BANNER DE EMERGENCIA
  ========================================================== */
  function mostrarBannerEmergencia() {
    if (document.getElementById('banner-crisis')) return;
    var b = document.createElement('div');
    b.id = 'banner-crisis';
    b.style.position = 'fixed';
    b.style.bottom = '0';
    b.style.left = '0';
    b.style.right = '0';
    b.style.background = '#c62828';
    b.style.color = 'white';
    b.style.padding = '12px 20px';
    b.style.zIndex = '10000';
    b.style.display = 'flex';
    b.style.alignItems = 'center';
    b.style.justifyContent = 'center';
    b.style.flexWrap = 'wrap';
    b.style.gap = '10px';
    b.style.boxShadow = '0 -4px 15px rgba(0,0,0,.3)';
    b.style.fontWeight = '600';
    b.style.fontSize = '0.95em';

    var span = document.createElement('span');
    span.textContent = 'Necesitas ayuda ahora?';
    b.appendChild(span);

    var lineas = [
      { texto: '800-911-2000', href: 'tel:800-911-2000' },
      { texto: 'SAPTEL',       href: 'tel:5552598121'   },
      { texto: '911',          href: 'tel:911'           }
    ];
    for (var i = 0; i < lineas.length; i++) {
      var a = document.createElement('a');
      a.textContent = lineas[i].texto;
      a.href = lineas[i].href;
      a.style.color = 'white';
      a.style.fontWeight = 'bold';
      a.style.background = 'rgba(255,255,255,.2)';
      a.style.padding = '5px 14px';
      a.style.borderRadius = '20px';
      a.style.textDecoration = 'none';
      b.appendChild(a);
    }

    var x = document.createElement('button');
    x.textContent = 'x';
    x.style.background = 'transparent';
    x.style.border = '1px solid white';
    x.style.color = 'white';
    x.style.borderRadius = '50%';
    x.style.width = '26px';
    x.style.height = '26px';
    x.style.cursor = 'pointer';
    x.style.fontSize = '0.9em';
    x.addEventListener('click', function () {
      var el = document.getElementById('banner-crisis');
      if (el) el.parentNode.removeChild(el);
    });
    b.appendChild(x);
    document.body.appendChild(b);
  }

  /* ==========================================================
     INIT
  ========================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();

    // Verificar si hay resultado rojo guardado
    var saved = State.getResult();
    if (saved && saved.nivel === 'rojo') mostrarBannerEmergencia();

    // Detectar página actual — funciona con XAMPP y con file://
    var fullPath = location.pathname + location.href;
    var page = location.pathname.split('/').pop() || 'index.html';
    // También verificar por href completo por si acaso
    var esEncuesta  = page === 'encuesta.html'  || location.href.indexOf('encuesta.html')  !== -1;
    var esContacto  = page === 'contacto.html'  || location.href.indexOf('contacto.html')  !== -1;
    var esRecursos  = page === 'recursos.html'  || location.href.indexOf('recursos.html')  !== -1;

    if (esEncuesta) initEncuesta();
    if (esContacto) { initChat(); initContacto(); }
    if (esRecursos) initRecursos();

    // Exponer funciones globales para los onclick del HTML
    window.calcularResultado      = calcularResultado;
    window.seleccionarPerspectiva = seleccionarPerspectiva;
    window.abrirChat              = abrirChat;
    window.cerrarChat             = cerrarChat;
    window.enviarMensaje          = enviarMensaje;
    window.confirmarNombreChat     = confirmarNombreChat;
    window.enviarFormulario       = enviarFormulario;
    // Para el boton "Volver a Evaluar" que se crea por JS con addEventListener, no necesita global
    // pero lo dejamos por si acaso
    window._reiniciarEncuesta     = reiniciarEncuesta;

    console.log('[PsicoApoyo] OK - ' + page);
  });

})(); // fin IIFE

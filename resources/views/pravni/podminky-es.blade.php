<h1>Términos y condiciones de TupTuDu</h1>
<p>En vigor desde el 30 de octubre de 2026</p>

<h2>1. Prestador</h2>
<p>
    El servicio TupTuDu (sitio web tuptudu.com y aplicación app.tuptudu.com) lo presta
    <strong>WormUP s.r.o.</strong>, con número de identificación de empresa (IČO) 07994605, NIF-IVA CZ07994605 y domicilio social
    en Žamberecká 483, 517 54 Vamberk, República Checa, inscrita en el Registro Mercantil del Tribunal Regional de
    Hradec Králové, sección C, hoja 43560 (en adelante, el «Prestador»). Contacto: <a href="{{ \App\Support\Domeny::url('web', '/contact') }}">formulario de contacto</a>, correo electrónico @include('partials.email-chraneny'), teléfono <a href="tel:+420604240051">+420 604 240 051</a>.
</p>

<h2>2. El servicio</h2>
<p>
    TupTuDu es una herramienta en línea para crear el boceto de una obra nueva o de una reforma: la distribución, el plano
    y su vista en 3D (en adelante, el «proyecto»). Está dirigida principalmente a particulares que planean una construcción o
    una reforma, y también a empresas y proyectistas que preparan bocetos para sus clientes.
</p>
<p>
    <strong>El proyecto creado en el servicio es un boceto orientativo.</strong> No sustituye a la documentación técnica
    exigida por la ley, a los cálculos de estructuras ni a la revisión por parte de un profesional habilitado (arquitecto,
    proyectista, ingeniero de estructuras). Antes de construir o de iniciar un procedimiento de licencia, el proyecto debe ser siempre
    elaborado y verificado por un profesional conforme a la normativa del país en el que se encuentre la construcción.
</p>
<p>
    Los datos procedentes de fuentes públicas y externas (por ejemplo, datos catastrales y cartográficos, altimétricos o geológicos de
    organismos públicos y de otros proveedores) se ofrecen tal como los facilita la fuente y tienen carácter meramente informativo. Su
    alcance varía según el país. El Prestador no responde de su exactitud, integridad ni actualización.
</p>

<h2>3. Cuenta de usuario</h2>
<ul>
    <li>Para trabajar con proyectos se necesita una cuenta. Al registrarse, el usuario confirma que ha leído estos términos y que los acepta.</li>
    <li>El usuario facilita información veraz, protege sus datos de acceso y es responsable de la actividad realizada con su cuenta.</li>
    <li>El usuario puede cerrar su cuenta en cualquier momento mediante el <a href="{{ \App\Support\Domeny::url('web', '/contact?tema=zruseni_uctu') }}">formulario de contacto</a>, indicando el correo electrónico con el que está registrada. Antes de cerrarla, el Prestador verifica la solicitud mediante un mensaje enviado a esa dirección. El cierre de la cuenta supone también la eliminación de sus proyectos.</li>
</ul>

<h2>4. Planes, precio y pagos</h2>
<ul>
    <li>El servicio puede utilizarse gratuitamente de forma limitada (plan Gratis). Los planes de pago (suscripción mensual o anual)
        amplían los límites y dan acceso a otras funciones. El alcance y los precios vigentes de los planes
        figuran en la <a href="{{ \App\Support\Domeny::url('web', '/pricing') }}">página de precios</a>.</li>
    {{-- Zkušební verze tarifu Stavebník (config/tarify.php, zkouska) --}}
    <li>El plan Home puede probarse gratis durante 14 días una vez por cuenta, sin introducir datos de pago. Durante
        la prueba los cambios no están limitados; el número de proyectos y las demás funciones corresponden al plan
        Gratis. Pasados 14 días, la cuenta vuelve automáticamente al plan Gratis; no se cobra nada, no se crea ninguna
        suscripción y los proyectos se conservan. La prueba no está disponible para cuentas que ya hayan tenido una
        suscripción.</li>
    <li><strong>Nuestro proceso de pedidos lo gestiona nuestro revendedor en línea Paddle.com. Paddle.com es el comerciante
        registrado (Merchant of Record) de todos nuestros pedidos.</strong> Paddle atiende todas las consultas de los clientes y gestiona las devoluciones.
        El contrato de compraventa se celebra con Paddle.com Market Limited, que acepta los pagos, emite los recibos
        y se encarga del IVA. A la compra se aplican también las <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener">condiciones de Paddle para compradores</a>.</li>
    <li>Los precios incluyen IVA. Las empresas con un NIF-IVA válido de la UE pueden pagar sin IVA; el usuario ve el importe final
        antes de pagar.</li>
    <li>La suscripción se renueva automáticamente por un periodo de la misma duración y se paga por adelantado hasta que el usuario
        la cancele. Puede cancelarse en cualquier momento en la aplicación (Suscripción); la cancelación surte efecto al
        final del periodo pagado y, hasta entonces, el plan de pago sigue activo.</li>
    <li>Cuando cambia el plan o la duración de la suscripción, la diferencia de precio se calcula proporcionalmente a los
        días restantes del periodo.</li>
    <li>Si no se puede cobrar el pago de la renovación, se aplica el plan Gratis hasta que se abone; los proyectos se conservan.</li>
    <li>El Prestador comunica cualquier cambio del precio de la suscripción por correo electrónico con al menos 30 días de antelación; el nuevo
        precio se aplica a partir del siguiente periodo. Si el usuario no está de acuerdo con el nuevo precio, puede cancelar la
        suscripción antes de que entre en vigor.</li>
    <li>Los reembolsos se rigen por la <a href="{{ \App\Support\Domeny::url('web', '/refunds') }}">Política de reembolso</a>.</li>
</ul>

<h2>5. Contenido del usuario</h2>
<ul>
    <li>Los proyectos y los materiales subidos (planos, imágenes) pertenecen al usuario.</li>
    <li>El usuario autoriza al Prestador a almacenar y tratar este contenido en la medida necesaria para prestar el servicio (visualización, cálculos, copias de seguridad).</li>
    <li>El usuario solo puede subir materiales que tenga derecho a utilizar y no puede usar el servicio de forma contraria a la ley.</li>
</ul>

<h2>6. Disponibilidad y responsabilidad</h2>
<ul>
    <li>El Prestador procura que el servicio esté disponible de forma continua, pero no lo garantiza; el servicio se desarrolla y modifica constantemente.</li>
    <li>Se recomienda exportar periódicamente los proyectos importantes.</li>
    <li>El Prestador no responde de los daños derivados de utilizar un proyecto como base para construir sin la verificación de un profesional (véase el apartado 2), ni de la pérdida de datos debida a circunstancias ajenas a su control. La responsabilidad frente a los consumidores no puede limitarse más allá de lo que permite la ley.</li>
</ul>

<h2>7. Consumidores</h2>
<p>
    Con carácter general, los consumidores tienen derecho a desistir de un contrato celebrado a distancia en un plazo de 14 días. En los
    servicios digitales de pago que comienzan de inmediato a petición expresa del consumidor, este derecho se rige por el artículo 1837
    del Código Civil checo (Ley n.º 89/2012 Sb.). El desistimiento de la compra de un plan de pago y los reembolsos los
    gestiona el revendedor Paddle.com conforme a las normas de la página <a href="{{ \App\Support\Domeny::url('web', '/refunds') }}">Política de reembolso</a>.
    El organismo de resolución extrajudicial de litigios de consumo es la Inspección Comercial Checa
    (<a href="https://adr.coi.cz" target="_blank">adr.coi.cz</a>). Los consumidores de otros países de la UE también pueden
    dirigirse al Centro Europeo del Consumidor de su país.
</p>

<h2>8. Protección de datos</h2>
<p>El tratamiento de los datos personales se describe en la <a href="{{ \App\Support\Domeny::url('web', '/privacy') }}">Política de privacidad</a>.</p>

<h2>9. Disposiciones finales</h2>
<ul>
    <li>La relación contractual se rige por la legislación de la República Checa. Ello no priva a los consumidores con residencia habitual en otro país de la protección que les otorgan las disposiciones imperativas de la legislación de ese país.</li>
    <li>El Prestador puede modificar estos términos; informará a los usuarios de cualquier cambio sustancial por correo electrónico con al menos 14 días de antelación. El usuario que no esté de acuerdo puede cerrar su cuenta.</li>
    <li>Los términos están disponibles en varios idiomas; en caso de discrepancia, prevalece la versión checa.</li>
</ul>

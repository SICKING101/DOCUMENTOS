<?php
include("conexion.php");

$id = $_GET['id'];
$result = $conexion->query("SELECT * FROM archivos WHERE id=$id");
$dato = $result->fetch_assoc();

if (isset($_POST['confirmar'])) {
  $nuevoNombre = $_POST['nombre'];
  $conexion->query("UPDATE archivos SET nombre='$nuevoNombre' WHERE id=$id");
  header("Location: index.php");
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Editar archivo</title>
  <style>
    /* --- Reset general --- */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: "Inter", sans-serif;
    }

    body {
      background-color: #0d1117;
      color: #e6edf3;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .container {
      background-color: #161b22;
      padding: 60px;
      border-radius: 16px;
      box-shadow: 0 0 25px rgba(0, 123, 255, 0.25);
      width: 420px;
      text-align: center;
    }

    h2 {
      color: #58a6ff;
      margin-bottom: 25px;
      font-size: 1.8em;
    }

    input[type="text"] {
      width: 100%;
      padding: 14px;
      margin-bottom: 25px;
      border: 1px solid #30363d;
      border-radius: 8px;
      background-color: #0d1117;
      color: #e6edf3;
      font-size: 1em;
      transition: all 0.3s;
    }

    input[type="text"]:focus {
      border-color: #58a6ff;
      outline: none;
      box-shadow: 0 0 6px rgba(88, 166, 255, 0.5);
    }

    button {
      background-color: #238636;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      transition: background-color 0.3s, transform 0.2s;
    }

    button:hover {
      background-color: #2ea043;
      transform: scale(1.05);
    }

    a {
      display: inline-block;
      margin-top: 20px;
      color: #58a6ff;
      text-decoration: none;
      font-size: 15px;
      transition: color 0.3s;
    }

    a:hover {
      color: #79c0ff;
    }

    /* --- Modal (confirmación) --- */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background-color: #161b22;
      padding: 30px 40px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 0 15px rgba(0, 123, 255, 0.3);
    }

    .modal h3 {
      color: #58a6ff;
      margin-bottom: 20px;
    }

    .modal button {
      margin: 10px;
    }

    .cancelar {
      background-color: #d73a49;
    }

    .cancelar:hover {
      background-color: #f85149;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Editar archivo</h2>
    <form id="editForm" method="POST">
      <input type="text" name="nombre" value="<?php echo $dato['nombre']; ?>" required>
      <button type="button" onclick="mostrarModal()">Guardar cambios</button>
      <input type="hidden" name="confirmar" value="1">
    </form>
    <a href="index.php">Volver al inicio</a>
  </div>

  <!-- Modal de confirmación -->
  <div class="modal" id="confirmModal">
    <div class="modal-content">
      <h3>¿Deseas guardar los cambios?</h3>
      <button onclick="confirmarCambios()">Sí, guardar</button>
      <button class="cancelar" onclick="cerrarModal()">Cancelar</button>
    </div>
  </div>

  <script>
    const modal = document.getElementById('confirmModal');
    const form = document.getElementById('editForm');

    function mostrarModal() {
      modal.style.display = 'flex';
    }

    function cerrarModal() {
      modal.style.display = 'none';
    }

    function confirmarCambios() {
      form.submit();
    }

    // Cerrar el modal al hacer clic fuera
    window.onclick = function(e) {
      if (e.target === modal) {
        cerrarModal();
      }
    }
  </script>
</body>
</html>
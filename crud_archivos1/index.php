<?php include("conexion.php"); ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CRUD de Archivos</title>
  <link rel="stylesheet" href="style.css">

</head>
<body>
      
  <h1>Crud de Archivos</h1>

  <form action="subir.php" method="POST" enctype="multipart/form-data">
    <input type="text" name="nombre" placeholder="Nombre" required>
    <input type="file" name="archivo" required>
    <button type="submit" name="subir">Subir</button>
  </form>

  <table>
    <tr>
      <th>ID</th>
      <th>Nombre</th>
      <th>Archivo</th>
      <th>Fecha</th>
      <th>Acciones</th>
    </tr>

    <?php
    $resultado = $conexion->query("SELECT * FROM archivos ORDER BY id DESC");
    while ($row = $resultado->fetch_assoc()) {
      echo "<tr>
              <td>{$row['id']}</td>
              <td>{$row['nombre']}</td>
              <td><a href='uploads/{$row['archivo']}' target='_blank'>{$row['archivo']}</a></td>
              <td>{$row['fecha']}</td>
              <td>
                <a href='editar.php?id={$row['id']}'>Editar</a> |
                <a href='eliminar.php?id={$row['id']}'
                   onclick='return confirm(\"¿Eliminar este archivo?\")'>Eliminar</a>
              </td>
            </tr>";
    }
    ?>
  </table>
</body>
</html>
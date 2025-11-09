<?php
include("conexion.php");

if (isset($_POST['subir'])) {
  $nombre = $_POST['nombre'];
  $archivo = $_FILES['archivo']['name'];
  $ruta = "uploads/" . basename($archivo);

  if (move_uploaded_file($_FILES['archivo']['tmp_name'], $ruta)) {
    $sql = "INSERT INTO archivos (nombre, archivo) VALUES ('$nombre', '$archivo')";
    $conexion->query($sql);
    header("Location: index.php");
  } else {
    echo "Error al subir el archivo.";
  }
}
?>
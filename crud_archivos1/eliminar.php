<?php
include("conexion.php");

$id = $_GET['id'];
$sql = $conexion->query("SELECT archivo FROM archivos WHERE id=$id");
$row = $sql->fetch_assoc();

if ($row) {
  unlink("uploads/" . $row['archivo']); // Eliminar archivo físico
  $conexion->query("DELETE FROM archivos WHERE id=$id");
}

header("Location: index.php");
?>
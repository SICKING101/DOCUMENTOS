<?php
// Configuración de la base de datos
class Database {
    private $host = 'localhost';
    private $db_name = 'sistema_documentos_profesional';
    private $username = 'root';
    private $password = '';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            $this->logError("Connection error: " . $exception->getMessage());
        }
        return $this->conn;
    }

    private function logError($message) {
        error_log($message);
    }
}
?>
<?php
class Autoloader
{
    
    // карта для соответствия неймспейса пути в файловой системе
    protected $namespaces = array();
 
    public function addNamespace($namespace, $rootDir)
    {
        if (is_dir($rootDir)) {
            $this->namespaces[$namespace] = $rootDir;
            return true;
        }
        
        return false;
    }
    
    public function register()
    {
        spl_autoload_register(array($this, "autoload"));
    }
    
    protected function autoload($class)
    {
        $pathParts = explode('\\', $class);

        if (is_array($pathParts)) {
            $namespace = array_shift($pathParts);
        
            if (!empty($this->namespaces[$namespace])) {
                $filePath = strtolower($this->namespaces[$namespace] . '/' . implode('/', $pathParts) . '.php');
                require_once $filePath;
                return true;
            }
        }
        
        return false;
    }
 
}
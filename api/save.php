<?php
/**
 * Salvează imaginea trimisă POST (base64 PNG) pe server.
 * POST: file=path, content=base64_data
 */
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}
$input = file_get_contents('php://input');
$post = [];
parse_str($input, $post);
$file = isset($post['file']) ? $post['file'] : '';
$content = isset($post['content']) ? $post['content'] : '';
if (!$file || !$content) {
    echo json_encode(['ok' => false, 'error' => 'Missing file or content']);
    exit;
}
$root = str_replace('\\', '/', dirname(__DIR__));
$file = str_replace(['\\', '..'], ['/', ''], $file);
if (strpos($file, '/') === 0) $file = substr($file, 1);
$full = $root . '/' . $file;
$dir = dirname($full);
if (!is_dir($dir)) {
    if (!@mkdir($dir, 0755, true)) {
        echo json_encode(['ok' => false, 'error' => 'Cannot create directory']);
        exit;
    }
}
if (preg_match('/^data:image\/\w+;base64,/', $content)) {
    $content = preg_replace('/^data:image\/\w+;base64,/', '', $content);
}
$bin = base64_decode($content, true);
if ($bin === false) {
    echo json_encode(['ok' => false, 'error' => 'Invalid base64']);
    exit;
}
if (file_put_contents($full, $bin) === false) {
    echo json_encode(['ok' => false, 'error' => 'Write failed']);
    exit;
}
echo json_encode(['ok' => true, 'path' => $file]);
?>

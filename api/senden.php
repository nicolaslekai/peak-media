<?php
/* ============ BLAUE STUNDE — enquiry form delivery (D-04, D-86) ============
   Receives the Kontakt form (js/contact.js posts it with fetch), checks it, sends it to
   service@blauestunde.media through Google Workspace SMTP with Reply-To set to the
   visitor, then sends the visitor a confirmation (text from Daniel, D-86 B5; HTML layout in
   lib/bestaetigung.html, with a plain-text copy).
   Not through Hostinger's own mail: the domain's SPF allows Google only (D-86 B2).
   The SMTP account and its app password live in a config file OUTSIDE public_html
   (see workspace tools/mail-config.example.php); nothing secret is in this repository.
   Answers JSON: 200 {ok:true} · 400 invalid input · 405 not POST · 429 too many enquiries
   this hour · 500 not sent. Stores no personal data: no database, no log of its own; only
   the times of the last hour's enquiries (a ceiling against bulk use).
   ========================================================================== */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/lib/phpmailer/Exception.php';
require __DIR__ . '/lib/phpmailer/PHPMailer.php';
require __DIR__ . '/lib/phpmailer/SMTP.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function answer(int $code, array $body): void {
  http_response_code($code);
  echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') answer(405, ['ok' => false]);

// public_html/api/senden.php → the folder above public_html
$configFile = dirname(__DIR__, 2) . '/mail-config.php';
if (!is_file($configFile)) answer(500, ['ok' => false, 'error' => 'config']);
$cfg = require $configFile;

// one line of text from the form, without line breaks (no header injection)
function field(string $name, int $max = 200): string {
  $v = trim((string)($_POST[$name] ?? ''));
  $v = preg_replace('/[\r\n\t]+/', ' ', $v);
  return mb_substr($v, 0, $max);
}

// the honeypot: people never see it, bots fill it in; pretend success, send nothing
if (field('website') !== '') answer(200, ['ok' => true]);

// a ceiling for the whole site, so the form cannot be used to send mail in bulk: at most
// 20 enquiries an hour; the file holds times only, no IP or other personal data
$stamps = sys_get_temp_dir() . '/blauestunde-form-' . md5(__DIR__) . '.json';
$recent = array_filter(json_decode(@file_get_contents($stamps) ?: '[]', true) ?: [], fn($t) => $t > time() - 3600);
if (count($recent) >= 20) answer(429, ['ok' => false, 'error' => 'busy']);

$types = ['hotel' => 'Hotel / Resort', 'bergbahn' => 'Bergbahn', 'therme' => 'Wellness', 'andere' => 'Etwas anderes'];
$type = field('betriebsart', 20);
$name = field('name', 120);
$email = field('email', 200);
$message = mb_substr(trim((string)($_POST['nachricht'] ?? '')), 0, 5000);
if (!isset($types[$type]) || $name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  answer(400, ['ok' => false, 'error' => 'input']);
}

// every answer the form can carry, in the order of the form, with the form's own words
$labels = [
  'betrieb' => 'Name des Betriebs', 'ort' => 'Ort',
  'zimmer' => 'Zimmer', 'bahn_struktur' => 'Betrieb oder Verbund', 'besuche' => 'Besuche pro Jahr',
  'kanaele' => 'Social-Media-Kanäle heute', 'rechner' => 'Aus Rechner oder Check',
];
$lines = ["Art des Betriebs: {$types[$type]}", "Name: $name", "E-Mail: $email"];
foreach ($labels as $key => $label) {
  $v = field($key, $key === 'rechner' ? 1000 : 200);
  if ($v !== '') $lines[] = "$label: $v";
}
$lines[] = '';
$lines[] = 'Nachricht:';
$lines[] = $message;
$lines[] = '';
$lines[] = '— gesendet über das Formular auf blauestunde.media/kontakt/';

function mailer(array $cfg): PHPMailer {
  $m = new PHPMailer(true);
  $m->isSMTP();
  $m->Host = $cfg['host'] ?? 'smtp.gmail.com';
  $m->Port = (int)($cfg['port'] ?? 587);
  $m->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $m->SMTPAuth = true;
  $m->Username = $cfg['user'];
  $m->Password = $cfg['password'];
  $m->CharSet = PHPMailer::CHARSET_UTF8;
  $m->setFrom($cfg['from'], $cfg['from_name'] ?? 'Blaue Stunde');
  return $m;
}

$subjectName = field('betrieb', 80) !== '' ? field('betrieb', 80) : $name;
try {
  $m = mailer($cfg);
  $m->addAddress($cfg['to'] ?? 'service@blauestunde.media');
  $m->addReplyTo($email, $name);
  $m->Subject = "Anfrage: {$types[$type]} – $subjectName";
  $m->Body = implode("\n", $lines);
  $m->send();
} catch (Exception $e) {
  answer(500, ['ok' => false, 'error' => 'send']);
}
$recent[] = time();
@file_put_contents($stamps, json_encode(array_values($recent)), LOCK_EX);

// the confirmation (D-86 B5); the enquiry has arrived even if this one fails. Fixed text
// only: nothing the visitor typed goes into it, so it cannot carry someone else's message.
// HTML from lib/bestaetigung.html with this text as its plain copy; without the file, the
// plain text alone
try {
  $c = mailer($cfg);
  $c->addAddress($email);
  // a reply to the confirmation goes to the shared address, not to the sending account
  $c->addReplyTo($cfg['to'] ?? 'service@blauestunde.media', 'Blaue Stunde');
  $c->Subject = 'Ihre Anfrage bei Blaue Stunde';
  $text = "Guten Tag,\n\n"
    . "danke für Ihre Anfrage. Sie ist bei uns angekommen; wir melden uns innerhalb von drei Werktagen.\n\n"
    . "So geht es weiter:\n"
    . "1. Wir lesen Ihre Anfrage und schauen uns Ihren Betrieb und Ihre Kanäle an.\n"
    . "2. Wir melden uns innerhalb von drei Werktagen, per Telefon oder E-Mail.\n"
    . "3. Nach einem ersten Gespräch erhalten Sie einen individuellen Kostenvoranschlag.\n\n"
    . "Fragen vorab? Antworten Sie einfach auf diese E-Mail.\n\n"
    . "Daniel Lenzenhuber · Blaue Stunde · +49 8362 8809394\n"
    . "https://blauestunde.media\n\n"
    . "Blaue Stunde ist ein Angebot von Bergwerk – Daniel Lenzenhuber, Faigeleweg 1, 87629 Füssen.\n"
    . "Impressum: https://blauestunde.media/impressum.html";
  $html = @file_get_contents(__DIR__ . '/lib/bestaetigung.html');
  if ($html) {
    $c->isHTML(true);
    $c->Body = $html;
    $c->AltBody = $text;
  } else {
    $c->Body = $text;
  }
  $c->send();
} catch (Exception $e) {
  // nothing to do: the enquiry itself was sent
}

answer(200, ['ok' => true]);

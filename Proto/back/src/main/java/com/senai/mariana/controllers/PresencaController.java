package com.senai.mariana.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/frequencia")
@CrossOrigin(origins = "*") // Permite que o seu index.html acesse a API sem bloqueios de segurança
public class PresencaController {

    // Armazenamento em memória para testes enquanto o banco de dados não estiver integrado
    private final List<Map<String, String>> registrosEmMemoria = new CopyOnWriteArrayList<>();

    @GetMapping("/registrar")
    public ResponseEntity<List<Map<String, String>>> listarFrequencias() {
        return ResponseEntity.ok(registrosEmMemoria);
    }

    @PostMapping("/registrar")
    public ResponseEntity<Map<String, Object>> registrarFrequencia(@RequestBody Map<String, String> dados) {
        String nome = dados.get("nome");
        String ra = dados.get("ra");
        String cpf = dados.get("cpf");
        
        // Em breve, vamos substituir isso pela busca real no banco de dados
        boolean sucesso = true; 

        Map<String, Object> resposta = new HashMap<>();
        
        if (sucesso) {
            registrosEmMemoria.add(new HashMap<>(dados));

            String identificacao;
            if (nome != null && !nome.isBlank()) {
                identificacao = nome;
            } else if (ra != null && !ra.isBlank()) {
                identificacao = "o aluno com R A " + ra;
            } else if (cpf != null && !cpf.isBlank()) {
                identificacao = "o aluno com CPF " + cpf;
            } else {
                identificacao = "o aluno";
            }

            resposta.put("status", "sucesso");
            // A mensagem formatada especificamente para o Text-to-Speech ler bem:
            resposta.put("mensagemVoz", "Presença registrada com sucesso para " + identificacao);
            return ResponseEntity.ok(resposta);
        } else {
            resposta.put("status", "erro");
            resposta.put("mensagemVoz", "Ocorreu um erro ao registrar. Por favor, procure o docente.");
            return ResponseEntity.badRequest().body(resposta);
        }
    }
}

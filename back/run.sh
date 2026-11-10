#!/usr/bin/env bash
cd /workspaces/Projeto-Mariana
CP="Proto/back/target/classes:$(find /home/codespace/.m2/repository -name "*.jar" | tr '\n' ':')"
exec java -cp "$CP" com.senai.mariana.MarianaApplication


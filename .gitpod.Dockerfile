FROM gitpod/workspace-full-vnc
                    
USER gitpod

ENV ANDROID_HOME /opt/android-sdk-linux

USER root

RUN apt update -qq && apt install zip unzip

RUN cd /opt && \
    wget https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip && \
    unzip -q *.zip -d ${ANDROID_HOME} && \
    rm *.zip

RUN chmod -R 777 ${ANDROID_HOME}

RUN apt clean -qq

USER gitpod

ENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/tools/bin:${ANDROID_HOME}/platform-tools

RUN bash -c "source ~/.sdkman/bin/sdkman-init.sh && \
                sdk install java 8.0.232-open"

RUN yes | sdkmanager --licenses

RUN yes | sdkmanager --update --channel=3

RUN npm install

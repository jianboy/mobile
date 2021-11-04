FROM gitpod/workspace-full-vnc
                    
USER gitpod

ENV ANDROID_HOME /opt/android-sdk-linux

# Install Node and Yarn
ENV NODE_VERSION=10.14
RUN bash -c ". .nvm/nvm.sh     && nvm install ${NODE_VERSION}     && nvm use ${NODE_VERSION}     && nvm alias default ${NODE_VERSION}"

RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix

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
                sdk install java 8.312.07.1-amzn"
ENV JAVA_HOME /home/gitpod/.sdkman/candidates/java/8.312.07.1-amzn

RUN yes | sdkmanager --licenses

RUN yes | sdkmanager --update --channel=3

RUN sdkmanager "platform-tools" 'build-tools;28.0.3' 'platforms;android-28'

RUN npm install -g nativescript@6.5.1

#RUN npm install

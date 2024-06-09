const amountOfTrainData = 100;
const amountHiddenLayers = 2;
const amountOfNeuronsInHiddenLayer = 100;
const hiddenLayerActivationFunction = "relu";
const lossFunction = "meanSquaredError";
const optimizer = "adam";
const learningRate = 0.01;
const batchSize = 32;
const epochs = 50;
const noiseVariance = 0.05;

// Funktion zur Datengenerierung
function generateData(N, noiseVariance) {
    const x = Array.from(tf.randomUniform([N], -2, 2).dataSync());
    const y = x.map(xi => 0.5 * (xi + 0.8) * (xi + 1.8) * (xi - 0.2) * (xi - 0.3) * (xi - 1.9) + 1);
    const yNoise = y.map(yi => yi + tf.randomNormal([1], 0, Math.sqrt(noiseVariance)).dataSync()[0]);
    return { x, y, yNoise };
}

// Daten generieren
const { x, y, yNoise } = generateData(amountOfTrainData, noiseVariance);
const N = x.length;
const halfN = Math.floor(N / 2);

// Daten in Trainings- und Testdatensätze aufteilen
const indices = tf.util.createShuffledIndices(N);
const trainIndices = indices.slice(0, halfN);
const testIndices = indices.slice(halfN);

const xTrain = trainIndices.map(i => x[i]);
const yTrain = trainIndices.map(i => y[i]);
const yTrainNoise = trainIndices.map(i => yNoise[i]);

const xTest = testIndices.map(i => x[i]);
const yTest = testIndices.map(i => y[i]);
const yTestNoise = testIndices.map(i => yNoise[i]);

// Funktion zur Erstellung des Modells
function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: amountOfNeuronsInHiddenLayer, activation: hiddenLayerActivationFunction, inputShape: [1] }));
    model.add(tf.layers.dense({ units: amountOfNeuronsInHiddenLayer, activation: hiddenLayerActivationFunction }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    return model;
}

// Funktion zum Kompilieren und Trainieren des Modells
async function trainModel(model, xTrain, yTrain, epochs) {
    model.compile({
        optimizer: tf.train.adam(learningRate),
        loss: lossFunction
    });

    const xs = tf.tensor1d(tf.util.flatten(xTrain));
    const ys = tf.tensor1d(tf.util.flatten(yTrain));
    return await model.fit(xs, ys, { epochs, batchSize: batchSize, shuffle: true });
}

// Vorhersagen und Plotten der Ergebnisse
async function plotData(container, x, y, yPred, title) {
    const values = x.map((xi, i) => ({ x: xi, y: y[i] }));
    const predValues = x.map((xi, i) => ({ x: xi, y: yPred[i] }));
    const series = ['Original', 'Predicted'];
    const data = { values: [values, predValues], series };
    tfvis.render.scatterplot(container, data, {
        xLabel: 'x',
        yLabel: 'y',
        height: 300,
        title
    });
}

// Modelle trainieren und Plotten der Ergebnisse
async function trainModelsAndPlot() {
    const modelUnnoised = createModel();
    const historyUnnoised = await trainModel(modelUnnoised, xTrain, yTrain, epochs);

    const modelBestFit = createModel();
    const historyBestFit = await trainModel(modelBestFit, xTrain, yTrainNoise, epochs);

    const modelOverfit = createModel();
    const historyOverfit = await trainModel(modelOverfit, xTrain, yTrainNoise, 200);

    const xsTest = tf.tensor1d(tf.util.flatten(xTest)); 
    const yPredUnnoisedTrain = Array.from(modelUnnoised.predict(tf.tensor1d(tf.util.flatten(xTrain))).dataSync());
    const yPredUnnoisedTest = Array.from(modelUnnoised.predict(xsTest).dataSync());

    const yPredBestFitTrain = Array.from(modelBestFit.predict(tf.tensor1d(tf.util.flatten(xTrain))).dataSync());
    const yPredBestFitTest = Array.from(modelBestFit.predict(xsTest).dataSync());

    const yPredOverfitTrain = Array.from(modelOverfit.predict(tf.tensor1d(tf.util.flatten(xTrain))).dataSync());
    const yPredOverfitTest = Array.from(modelOverfit.predict(xsTest).dataSync());

    // Plot original and noisy data
    tfvis.render.scatterplot(
        document.getElementById('original-data'),
        { values: x.map((xi, i) => ({ x: xi, y: y[i] })) },
        { xLabel: 'x', yLabel: 'y', height: 300 }
    );
    tfvis.render.scatterplot(
        document.getElementById('noisy-data'),
        { values: x.map((xi, i) => ({ x: xi, y: yNoise[i] })) },
        { xLabel: 'x', yLabel: 'y', height: 300 }
    );

    // Plot model predictions
    await plotData(document.getElementById('unnoised-model-train'), xTrain, yTrain, yPredUnnoisedTrain, 'Unnoised Model - Train Data');
    await plotData(document.getElementById('unnoised-model-test'), xTest, yTest, yPredUnnoisedTest, 'Unnoised Model - Test Data');
    await plotData(document.getElementById('best-fit-model-train'), xTrain, yTrainNoise, yPredBestFitTrain, 'Best Fit Model - Train Data');
    await plotData(document.getElementById('best-fit-model-test'), xTest, yTestNoise, yPredBestFitTest, 'Best Fit Model - Test Data');
    await plotData(document.getElementById('overfit-model-train'), xTrain, yTrainNoise, yPredOverfitTrain, 'Overfit Model - Train Data');
    await plotData(document.getElementById('overfit-model-test'), xTest, yTestNoise, yPredOverfitTest, 'Overfit Model - Test Data');

    // Plot training history
    tfvis.show.history(
        document.getElementById('unnoised-model-hist'),
        historyUnnoised,
        ['loss']
    );
    tfvis.show.history(
        document.getElementById('best-fit-model-hist'),
        historyBestFit,
        ['loss']
    );
    tfvis.show.history(
        document.getElementById('overfit-model-hist'),
        historyOverfit,
        ['loss']
    );
}

trainModelsAndPlot();

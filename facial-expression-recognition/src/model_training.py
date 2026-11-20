"""Standalone CNN training and evaluation script for FER2013."""

import argparse
from datetime import datetime
import json
from pathlib import Path
import sys
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.preprocessing.image import ImageDataGenerator

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    CONFUSION_MATRIX_PLOT_PATH,
    DATASET_DIR,
    EMOTION_LABELS,
    EMOTION_MODEL_PATH,
    INPUT_SIZE,
    MODELS_DIR,
    TRAINING_HISTORY_PLOT_PATH,
    TRAINING_METRICS_PATH,
)


def build_cnn_model(input_shape=(48, 48, 1), num_classes: int = 7) -> tf.keras.Model:
    """Build 3-block Convolutional Neural Network for 48x48 grayscale FER2013."""
    model = models.Sequential(
        [
            layers.Input(shape=input_shape),
            layers.Conv2D(32, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.Conv2D(32, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(64, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.Conv2D(64, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(128, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.Conv2D(128, (3, 3), padding="same", activation="relu"),
            layers.BatchNormalization(),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            layers.Flatten(),
            layers.Dense(256, activation="relu"),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            layers.Dense(num_classes, activation="softmax"),
        ]
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def save_training_plots(history: tf.keras.callbacks.History, out_path: Path) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    axes[0].plot(history.history["accuracy"], label="Train Accuracy", color="#315EAD")
    axes[0].plot(history.history["val_accuracy"], label="Val Accuracy", color="#16A36A")
    axes[0].set_title("CNN Accuracy Curve")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Accuracy")
    axes[0].legend()

    axes[1].plot(history.history["loss"], label="Train Loss", color="#315EAD")
    axes[1].plot(history.history["val_loss"], label="Val Loss", color="#E05252")
    axes[1].set_title("CNN Loss Curve")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Loss")
    axes[1].legend()

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def save_confusion_matrix_plot(cm: np.ndarray, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm, cmap="Blues")
    fig.colorbar(im, ax=ax)
    ax.set_xticks(range(len(EMOTION_LABELS)))
    ax.set_yticks(range(len(EMOTION_LABELS)))
    ax.set_xticklabels(EMOTION_LABELS, rotation=45, ha="right")
    ax.set_yticklabels(EMOTION_LABELS)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("FER2013 Confusion Matrix")

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", color="#172033", fontsize=8)

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def train(dataset_dir: Path, epochs: int, batch_size: int) -> None:
    train_dir = dataset_dir / "train"
    test_dir = dataset_dir / "test"
    if not train_dir.exists() or not test_dir.exists():
        raise FileNotFoundError(
            f"Expected 'train/' and 'test/' folders inside {dataset_dir}. "
            "Download FER2013 from Kaggle (msambare/fer2013) first."
        )

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    train_gen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1,
        horizontal_flip=True,
        validation_split=0.15,
    )
    test_gen = ImageDataGenerator(rescale=1.0 / 255.0)

    train_flow = train_gen.flow_from_directory(
        str(train_dir),
        target_size=INPUT_SIZE,
        color_mode="grayscale",
        batch_size=batch_size,
        class_mode="categorical",
        subset="training",
        shuffle=True,
    )
    val_flow = train_gen.flow_from_directory(
        str(train_dir),
        target_size=INPUT_SIZE,
        color_mode="grayscale",
        batch_size=batch_size,
        class_mode="categorical",
        subset="validation",
        shuffle=False,
    )
    test_flow = test_gen.flow_from_directory(
        str(test_dir),
        target_size=INPUT_SIZE,
        color_mode="grayscale",
        batch_size=batch_size,
        class_mode="categorical",
        shuffle=False,
    )

    model = build_cnn_model(input_shape=(48, 48, 1), num_classes=len(EMOTION_LABELS))
    callbacks = [
        ModelCheckpoint(
            str(EMOTION_MODEL_PATH),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
    ]

    history = model.fit(
        train_flow,
        validation_data=val_flow,
        epochs=epochs,
        callbacks=callbacks,
    )

    test_loss, test_acc = model.evaluate(test_flow, verbose=1)
    y_prob = model.predict(test_flow, verbose=1)
    y_pred = np.argmax(y_prob, axis=1)
    y_true = test_flow.classes

    cm = confusion_matrix(y_true, y_pred)
    report = classification_report(
        y_true, y_pred, target_names=EMOTION_LABELS, output_dict=True
    )

    save_training_plots(history, TRAINING_HISTORY_PLOT_PATH)
    save_confusion_matrix_plot(cm, CONFUSION_MATRIX_PLOT_PATH)

    metrics_payload = {
        "trainAccuracy": [round(float(x), 4) for x in history.history["accuracy"]],
        "valAccuracy": [round(float(x), 4) for x in history.history["val_accuracy"]],
        "trainLoss": [round(float(x), 4) for x in history.history["loss"]],
        "valLoss": [round(float(x), 4) for x in history.history["val_loss"]],
        "testAccuracy": round(float(test_acc), 4),
        "testLoss": round(float(test_loss), 4),
        "confusionMatrix": cm.tolist(),
        "classificationReport": report,
        "trainedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    TRAINING_METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")
    print(f"Saved trained model to {EMOTION_MODEL_PATH}")
    print(f"Saved real evaluation metrics to {TRAINING_METRICS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train FER2013 CNN Expression Model")
    parser.add_argument("--dataset", type=Path, default=DATASET_DIR)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()
    train(args.dataset, args.epochs, args.batch_size)

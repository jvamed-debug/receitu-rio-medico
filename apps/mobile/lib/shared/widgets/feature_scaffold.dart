import 'package:flutter/material.dart';

class FeatureScaffold extends StatelessWidget {
  const FeatureScaffold({
    required this.title,
    required this.subtitle,
    required this.children,
    super.key,
    this.action,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: action == null ? null : [Padding(padding: const EdgeInsets.only(right: 12), child: action!)],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            subtitle,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: const Color(0xFF5F6F68),
                ),
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }
}
